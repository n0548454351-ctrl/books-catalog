/**
 * BookCover — renders a book cover image.
 *
 * Google Drive public links ( drive.google.com/uc?id=... ) cannot be used
 * directly in <Image> because:
 *   1. Next.js image optimisation requires whitelisted hostnames
 *   2. Drive redirects through a cookie-check that blocks the Image component
 *
 * Strategy (in order):
 *   A. If the URL is already a Supabase Storage URL → use <Image> normally
 *   B. If it is a Drive URL → proxy through /api/image-proxy?url=...
 *      which downloads server-side and streams the bytes back
 *   C. Fallback → show the placeholder SVG
 */

"use client";
import { useState } from "react";
import Image from "next/image";

interface Props {
  src:    string;
  alt:    string;
  fill?:  boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

function isSupabaseUrl(url: string) {
  return url.includes(".supabase.co/storage/");
}

function isDriveUrl(url: string) {
  return (
    url.includes("drive.google.com") ||
    url.includes("googleusercontent.com") ||
    url.includes("lh3.google")
  );
}

function toProxiedUrl(url: string) {
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

export default function BookCover({
  src, alt, fill, sizes, priority, className,
}: Props) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/placeholder-book.svg"
        alt={alt}
        className={className}
        style={fill ? { width: "100%", height: "100%", objectFit: "cover" } : undefined}
      />
    );
  }

  // Supabase Storage — use Next.js Image normally
  if (isSupabaseUrl(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill={fill}
        sizes={sizes}
        priority={priority}
        className={className}
        onError={() => setErrored(true)}
      />
    );
  }

  // Google Drive — route through our server-side proxy
  if (isDriveUrl(src)) {
    const proxied = toProxiedUrl(src);
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={proxied}
        alt={alt}
        className={className}
        style={fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" } : undefined}
        onError={() => setErrored(true)}
        loading={priority ? "eager" : "lazy"}
      />
    );
  }

  // Any other URL — try with <Image> unoptimized
  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      sizes={sizes}
      priority={priority}
      className={className}
      unoptimized
      onError={() => setErrored(true)}
    />
  );
}
