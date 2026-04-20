import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // NOTE: Google Drive URLs are NOT listed here.
    // They are served via /api/image-proxy instead,
    // which avoids the redirect/cookie issue.
  },
};

export default nextConfig;
