import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow API proxy to backend in development
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:4000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
