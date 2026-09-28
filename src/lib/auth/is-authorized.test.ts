import { describe, expect, it } from "vitest";
import { isAuthorized } from "./is-authorized";

describe("isAuthorized", () => {
  it("denies access when there is no session", () => {
    expect(isAuthorized({ auth: null })).toBe(false);
  });

  it("denies access when the session has no user", () => {
    // @ts-expect-error deliberately malformed session for the test
    expect(isAuthorized({ auth: { user: undefined } })).toBe(false);
  });

  it("allows access when the session has a user", () => {
    expect(
      isAuthorized({
        auth: { user: { id: "founder", email: "founder@kargo.com" }, expires: "2999-01-01" },
      })
    ).toBe(true);
  });
});
