import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except static files, API routes, and Next internals
  matcher: ["/((?!api|auth-api|_next|_vercel|.*\\..*).*)"],
};
