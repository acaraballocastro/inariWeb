
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Dev server reached from the local network (phone, LAN IP); any 192.168.1.x,
  // so a new IP from the router does not break it.
  allowedDevOrigins: ["192.168.1.*"],

  // Mantener el resto de tu configuración actual.
  
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },

  cacheComponents: true,
  partialPrefetching: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
