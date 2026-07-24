import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    // Recharts imports this subpath through victory-vendor. Keep the same
    // resolver as the web application for clean Vercel builds.
    resolveAlias: {
      "victory-vendor/d3-shape": "d3-shape",
      "d3-shape": "d3-shape/src/index.js",
    },
  },
  async redirects() {
    return [
      {
        source: "/index",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;