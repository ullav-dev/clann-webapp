import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

function route(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  // Let internal Next.js Route Handlers pass through (not proxied to clann-server).
  if (pathname.startsWith("/api/ai/") || pathname.startsWith("/api/irish-genealogy/")) {
    return NextResponse.next();
  }

  // Proxy /api/dam/* → ullav-dam-server (strips /api/dam prefix).
  // Must be checked before the generic /api/* rule below.
  if (pathname.startsWith("/api/dam/")) {
    const damUrl = process.env.DAM_URL ?? "http://ullav-dam-server:8080";
    return NextResponse.rewrite(
      new URL(pathname.slice("/api/dam".length) + search, damUrl)
    );
  }

  // Let file-upload endpoints be handled by Next.js Route Handlers.
  // NextResponse.rewrite() runs in the Edge Runtime and doesn't properly stream
  // multipart/form-data bodies, causing clann-server's parser to hang.
  if (/^\/api\/persons\/[^/]+\/(?:image|life-image)$/.test(pathname)) {
    return NextResponse.next();
  }

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

  return intlMiddleware(request) as NextResponse;
}

export function proxy(request: NextRequest) {
  const response = route(request);
  const portalUrl =
    process.env.PORTAL_URL ?? "https://setanta-portal.ullav.com http://localhost:3003";
  response.headers.set("Content-Security-Policy", `frame-ancestors 'self' ${portalUrl}`);
  return response;
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
