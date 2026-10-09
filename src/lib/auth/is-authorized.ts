import { NextResponse, type NextRequest } from "next/server";
import type { Session } from "next-auth";

/**
 * The route-protection decision used by proxy.ts (via auth.ts's `authorized`
 * callback). Getting this wrong means every route (candidate PII included)
 * is publicly readable.
 *
 * MUST return a NextResponse (not just `false`) to actually redirect:
 * next-auth's `auth(middleware)` wrapper (see node_modules/next-auth/lib/
 * index.js's handleAuth) only auto-redirects on a falsy `authorized` result
 * when NO custom middleware was supplied to `auth(...)`. proxy.ts supplies
 * one (to set the CSP nonce), so once a custom middleware exists, that
 * middleware runs unconditionally and a plain `false` here is silently
 * discarded — only an explicit NextResponse return actually stops the
 * request before it reaches the app. (Confirmed the hard way: shipping this
 * as a boolean made the whole app briefly publicly accessible with no login
 * at all, caught by the E2E suite rather than sooner — see git history.)
 *
 * /login is exempted: proxy.ts's matcher includes it (so it still gets a CSP
 * nonce), and since `pages.signIn` is also "/login", redirecting it back to
 * itself would loop.
 */
export function isAuthorized({
  auth,
  request,
}: {
  auth: Session | null;
  request: NextRequest;
}): boolean | NextResponse {
  if (request.nextUrl.pathname === "/login") return true;
  if (auth?.user) return true;

  const signInUrl = request.nextUrl.clone();
  signInUrl.pathname = "/login";
  signInUrl.searchParams.set("callbackUrl", request.nextUrl.href);
  return NextResponse.redirect(signInUrl);
}
