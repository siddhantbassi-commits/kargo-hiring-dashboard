import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { isAuthorized } from "./is-authorized";

function requestFor(pathname: string) {
  return { nextUrl: { pathname } } as NextRequest;
}

describe("isAuthorized", () => {
  it("denies access when there is no session", () => {
    expect(isAuthorized({ auth: null, request: requestFor("/") })).toBe(false);
  });

  it("denies access when the session has no user", () => {
    // @ts-expect-error deliberately malformed session for the test
    expect(isAuthorized({ auth: { user: undefined }, request: requestFor("/") })).toBe(false);
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
