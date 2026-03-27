import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      // Proxy /api/* to the clann-server backend (avoids CORS)
      {
        source: "/api/:path*",
        destination: `${process.env.API_URL ?? "http://clann-server:3001"}/api/:path*`,
      },
      // Proxy /auth-api/* to the user-management service (avoids CORS)
      {
        source: "/auth-api/:path*",
        destination: `${process.env.AUTH_URL ?? "http://ullav-auth:8081"}/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
