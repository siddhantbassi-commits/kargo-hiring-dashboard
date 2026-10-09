import type { NextRequest } from "next/server";
import type { Session } from "next-auth";

/**
 * The route-protection decision used by proxy.ts (via auth.ts's `authorized`
 * callback). Extracted as a standalone function because `auth` used bare as
 * a Next.js proxy/middleware handler does NOT redirect unauthenticated
 * requests on its own — it only attaches session info to the request unless
 * an `authorized` callback tells it to enforce something. Getting this wrong
 * means every route (candidate PII included) is publicly readable.
 *
 * /login is exempted: proxy.ts's matcher now includes it (so it still gets a
 * CSP nonce), and since `pages.signIn` is also "/login", gating it here would
 * redirect-loop a logged-out visitor back to the page they're already on.
 */
export function isAuthorized({ auth, request }: { auth: Session | null; request: NextRequest }): boolean {
  if (request.nextUrl.pathname === "/login") return true;
  return !!auth?.user;
}
