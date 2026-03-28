import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Proxy /api/* → clann-server (keeps /api prefix).
  // API_URL is read at request time so it can be set via runtime env vars.
  if (pathname.startsWith("/api/")) {
    const apiUrl = process.env.API_URL ?? "http://clann-server:3001";
    return NextResponse.rewrite(new URL(pathname + search, apiUrl));
  }

  // Proxy /auth-api/* → ullav-user-management (strips /auth-api prefix).
  if (pathname.startsWith("/auth-api/")) {
    const authUrl = process.env.AUTH_URL ?? "http://ullav-auth:8081";
    return NextResponse.rewrite(
      new URL(pathname.slice("/auth-api".length) + search, authUrl)
    );
  }

  return intlMiddleware(request);
}

export const config = {
  // api/* and auth-api/* are now included (handled above before intl middleware)
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
