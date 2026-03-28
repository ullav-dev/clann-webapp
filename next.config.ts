import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  // API proxying (/api/* and /auth-api/*) is handled in src/middleware.ts so
  // that API_URL / AUTH_URL are read at request time from process.env rather
  // than being baked into routes-manifest.json at build time.
};

export default withNextIntl(nextConfig);
