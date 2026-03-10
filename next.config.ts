import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Proxy /api/* to the clann-server backend during development
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
