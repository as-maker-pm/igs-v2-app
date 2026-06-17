import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-inline' is required for Next.js hydration scripts
      "script-src 'self' 'unsafe-inline'",
      // MapLibre GL JS requires inline styles for rendering
      "style-src 'self' 'unsafe-inline'",
      // MapLibre renders tiles as blobs and data URIs
      "img-src 'self' data: blob: https:",
      // MapLibre uses blob: web workers
      "worker-src blob:",
      // Allow fetching tiles, map style/sprites/glyphs, and geocoding
      "connect-src 'self' https://igsmapdata.blob.core.windows.net https://tiles.openfreemap.org https://nominatim.openstreetmap.org",
      "font-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
