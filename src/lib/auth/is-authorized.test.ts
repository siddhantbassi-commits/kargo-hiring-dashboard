import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { isAuthorized } from "./is-authorized";

function makeUrl(pathname: string): URL {
  const url = new URL(`https://e2e.test${pathname}`);
  return Object.assign(url, { clone: () => makeUrl(pathname) });
}

function requestFor(pathname: string): NextRequest {
  return { nextUrl: makeUrl(pathname) } as unknown as NextRequest;
}

describe("isAuthorized", () => {
  // A plain `false` is NOT enough here — see the comment in is-authorized.ts.
  // Only an actual NextResponse redirect stops an unauthenticated request
  // once proxy.ts supplies its own middleware (for the CSP nonce).

  it("redirects to /login when there is no session", () => {
    const result = isAuthorized({ auth: null, request: requestFor("/") });
    expect(result).not.toBe(true);
    expect((result as Response).headers.get("location")).toContain("/login");
  });

  it("redirects to /login when the session has no user", () => {
    // @ts-expect-error deliberately malformed session for the test
    const result = isAuthorized({ auth: { user: undefined }, request: requestFor("/") });
    expect(result).not.toBe(true);
    expect((result as Response).headers.get("location")).toContain("/login");
  });

  it("preserves the original URL as callbackUrl on the redirect", () => {
    const result = isAuthorized({ auth: null, request: requestFor("/candidates/abc123") }) as Response;
    const location = decodeURIComponent(result.headers.get("location") ?? "");
    expect(location).toContain("/login");
    expect(location).toContain("callbackUrl=https://e2e.test/candidates/abc123");
  });

  it("allows access when the session has a user", () => {
    expect(
      isAuthorized({
        auth: { user: { id: "founder", email: "founder@kargo.com" }, expires: "2999-01-01" },
        request: requestFor("/"),
      })
    ).toBe(true);
  });

  it("allows /login even without a session, to avoid a redirect loop", () => {
    expect(isAuthorized({ auth: null, request: requestFor("/login") })).toBe(true);
  });
});
