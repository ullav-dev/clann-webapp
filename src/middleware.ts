import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const portalUrl =
    process.env.PORTAL_URL ?? "https://setanta-portal.ullav.com http://localhost:3003";
  response.headers.set(
    "Content-Security-Policy",
    `frame-ancestors 'self' ${portalUrl}`,
  );
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
