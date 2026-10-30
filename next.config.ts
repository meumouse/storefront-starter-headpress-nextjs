import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const root = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.NEXT_PUBLIC_WP_URL) {
  console.warn("[config] NEXT_PUBLIC_WP_URL is not set: using the mock WordPress at http://127.0.0.1:8787.");
}

/** Media host of the WordPress backend, so `next/image` can optimize product images. */
function wordpressImagePatterns(): NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> {
  const url = process.env.NEXT_PUBLIC_WP_URL;
  if (!url) return [];
  try {
    const { protocol, hostname, port } = new URL(url);
    return [{ protocol: protocol === "http:" ? "http" : "https", hostname, port }];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  outputFileTracingRoot: root,
  images: {
    remotePatterns: [
      ...wordpressImagePatterns(),
      { protocol: "https", hostname: "secure.gravatar.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
