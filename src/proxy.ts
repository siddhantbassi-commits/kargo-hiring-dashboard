export { auth as proxy } from "@/auth";

/**
 * Every route requires a session except the login page, the NextAuth API
 * routes themselves, and static assets. This is the whole authorization
 * story for this internal one-founder tool — see auth.ts.
 *
 * Next.js 16 renamed the "middleware" file convention to "proxy" (same
 * mechanics); the `auth` wrapper from next-auth is just a plain request
 * handler function, so it works unchanged as the named `proxy` export.
 */
export const config = {
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)"],
};
