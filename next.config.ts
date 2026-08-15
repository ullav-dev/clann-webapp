import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { execFileSync } from "child_process";
import { readFileSync } from "fs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const appVersion: string = JSON.parse(readFileSync("./package.json", "utf-8")).version;
const gitSha: string = (() => {
  try { return execFileSync("git", ["rev-parse", "--short", "HEAD"]).toString().trim(); }
  catch { return "dev"; }
})();

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
    NEXT_PUBLIC_GIT_SHA: gitSha,
  },
  // API proxying (/api/* and /auth-api/*) is handled in src/middleware.ts so
  // that API_URL / AUTH_URL are read at request time from process.env rather
  // than being baked into routes-manifest.json at build time.
  // @ullav-dev/tack-notes and @ullav-dev/dam-picker both ship raw TS source
  // with no build step -- Turbopack can't otherwise resolve their module
  // type.
  transpilePackages: ["@ullav-dev/dam-picker", "@ullav-dev/tack-notes"],
};

export default withNextIntl(nextConfig);
