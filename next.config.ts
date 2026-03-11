import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Proxy /api/* to the clann-server backend (avoids CORS)
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}/api/:path*`,
      },
      // Proxy /auth-api/* to the user-management service (avoids CORS)
      {
        source: "/auth-api/:path*",
        destination: `${process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:8081"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
