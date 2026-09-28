import type { Session } from "next-auth";

/**
 * The route-protection decision used by proxy.ts (via auth.ts's `authorized`
 * callback). Extracted as a standalone function because `auth` used bare as
 * a Next.js proxy/middleware handler does NOT redirect unauthenticated
 * requests on its own — it only attaches session info to the request unless
 * an `authorized` callback tells it to enforce something. Getting this wrong
 * means every route (candidate PII included) is publicly readable.
 */
export function isAuthorized({ auth }: { auth: Session | null }): boolean {
  return !!auth?.user;
}
