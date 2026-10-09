import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

/**
 * `auth(middleware)` runs the `authorized` callback (auth.ts / is-authorized.ts)
 * first — redirecting unauthenticated requests to /login — and only invokes
 * this function for requests that pass. That's the hook point for also
 * minting a per-request CSP nonce, per this Next.js version's documented
 * pattern (node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
 * Setting the CSP on the request headers (not just the response) is what lets
 * Next.js auto-apply the nonce to its own hydration/RSC scripts.
 *
 * style-src stays 'unsafe-inline' rather than nonce-based: several components
 * set dynamic inline `style={{...}}` attributes (e.g. role-accent dots, score
 * rings), and a CSP nonce/hash only covers <style> elements, not style
 * attributes — per spec, adding a nonce to style-src would make browsers
 * ignore 'unsafe-inline' entirely and break those. script-src is the
 * meaningful XSS boundary here, and it gets the full nonce + strict-dynamic
 * treatment.
 */
export const proxy = auth((request: NextRequest) => {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' data:;
    font-src 'self';
    connect-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
  `;
  const contentSecurityPolicyHeaderValue = cspHeader.replace(/\s{2,}/g, " ").trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);
  return response;
});

/**
 * Every HTML route goes through this (including /login now, so it also gets
 * a nonce — is-authorized.ts exempts it from the session check so it doesn't
 * redirect-loop to itself). API routes are excluded: they don't render HTML
 * and some (e.g. the health-check route the cron job hits) authenticate with
 * their own Bearer-token scheme instead of a session cookie.
 */
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
