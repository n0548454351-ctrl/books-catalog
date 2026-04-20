/**
 * /api/image-proxy?url=<encoded-url>
 *
 * Downloads a Google Drive image server-side and streams it to the browser.
 * Handles Drive's redirect chain and virus-scan confirmation pages.
 */

import { NextRequest, NextResponse } from "next/server";

const TIMEOUT_MS = 15_000;

// Convert any Drive URL variant to a direct download URL
function toDriveDirectUrl(raw: string): string {
  // Already a Supabase or other direct image URL
  if (!raw.includes("drive.google.com") && !raw.includes("googleusercontent.com")) {
    return raw;
  }

  // Extract file ID from any Drive URL format
  let fileId: string | null = null;

  // Format: ?id=FILE_ID or &id=FILE_ID
  const m1 = raw.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m1) fileId = m1[1];

  // Format: /file/d/FILE_ID/
  if (!fileId) {
    const m2 = raw.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
    if (m2) fileId = m2[1];
  }

  // Format: /d/FILE_ID
  if (!fileId) {
    const m3 = raw.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    if (m3) fileId = m3[1];
  }

  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
  }

  return raw;
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json({ error: "url param required" }, { status: 400 });
  }

  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(rawUrl);
  } catch {
    return NextResponse.json({ error: "invalid url encoding" }, { status: 400 });
  }

  const targetUrl = toDriveDirectUrl(decodedUrl);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.error(`[image-proxy] upstream ${response.status} for ${targetUrl}`);
      return new NextResponse(null, { status: 502 });
    }

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Detect if Drive returned HTML instead of an image (virus-scan / login gate)
    // HTML starts with < (0x3C) or whitespace
    const firstByte = bytes[0];
    const isHtml =
      firstByte === 0x3c || // '<'
      firstByte === 0x0a || // newline
      firstByte === 0x0d || // carriage return
      firstByte === 0x20 || // space
      (bytes.length > 14 &&
        String.fromCharCode(...bytes.slice(0, 15)).toLowerCase().includes("<!doctype"));

    if (isHtml || bytes.length < 500) {
      // Try the thumbnail / preview URL as fallback
      const fileId = decodedUrl.match(/[?&]id=([a-zA-Z0-9_-]{10,})/)?.[1];
      if (fileId) {
        const thumbUrl = `https://lh3.googleusercontent.com/d/${fileId}=s400`;
        const thumbRes = await fetch(thumbUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "image/*",
          },
        }).catch(() => null);

        if (thumbRes?.ok) {
          const thumbBuf = await thumbRes.arrayBuffer();
          const thumbBytes = new Uint8Array(thumbBuf);
          if (thumbBytes[0] !== 0x3c && thumbBuf.byteLength > 500) {
            const ct = thumbRes.headers.get("content-type") ?? "image/jpeg";
            return new NextResponse(thumbBuf, {
              status: 200,
              headers: {
                "Content-Type": ct,
                "Cache-Control": "public, max-age=86400",
                "X-Proxy-Source": "thumbnail-fallback",
              },
            });
          }
        }
      }

      console.error(`[image-proxy] Drive returned HTML for ${targetUrl}`);
      return new NextResponse(null, { status: 502 });
    }

    // Detect content type from magic bytes
    let contentType = "image/jpeg";
    if (bytes[0] === 0x89 && bytes[1] === 0x50) contentType = "image/png";
    else if (bytes[0] === 0x47 && bytes[1] === 0x49) contentType = "image/gif";
    else if (
      bytes[0] === 0x52 && bytes[1] === 0x49 &&
      bytes[8] === 0x57 && bytes[9] === 0x45
    ) contentType = "image/webp";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, immutable",
        "Content-Length": String(buffer.byteLength),
        "X-Proxy-Source": "drive",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[image-proxy] fetch error: ${msg}`);
    return new NextResponse(null, { status: 502 });
  }
}