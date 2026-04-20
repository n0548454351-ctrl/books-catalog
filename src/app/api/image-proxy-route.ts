import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return new Response("Missing URL", { status: 400 });
  }

  let finalUrl = url;

  // 🔥 המרה ל-Google Drive
  if (url.includes("drive.google.com")) {
    const match = url.match(/id=([^&]+)/);
    if (match) {
      finalUrl = `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
  }

  try {
    const res = await fetch(finalUrl);

    if (!res.ok) {
      return new Response("Failed to fetch image", { status: 404 });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";

    return new Response(res.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (err) {
    return new Response("Error fetching image", { status: 500 });
  }
}