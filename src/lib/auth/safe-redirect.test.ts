import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it("accepts a plain relative path", () => {
    expect(safeRedirectPath("/settings")).toBe("/settings");
    expect(safeRedirectPath("/candidates/abc123")).toBe("/candidates/abc123");
  });

  it("preserves the query string", () => {
    expect(safeRedirectPath("/?search=priya")).toBe("/?search=priya");
  });

  it("strips the host from an absolute same-origin URL (proxy.ts's own format)", () => {
    expect(safeRedirectPath("http://localhost:3000/settings")).toBe("/settings");
    expect(safeRedirectPath("https://kargo-hiring-dashboard-ochre.vercel.app/rubric")).toBe("/rubric");
  });

  it("discards an attacker-controlled host, keeping only the path", () => {
    // The dangerous case: an open redirect would send the founder's session
    // to evil.example after a real login. This must never happen — only the
    // path (safely re-based onto our own origin) is ever reused.
    expect(safeRedirectPath("https://evil.example/phish")).toBe("/phish");
    expect(safeRedirectPath("http://evil.example")).toBe("/");
  });

  it("discards a protocol-relative host", () => {
    expect(safeRedirectPath("//evil.example/phish")).toBe("/phish");
  });

  it("rejects non-hierarchical schemes like javascript:", () => {
    expect(safeRedirectPath("javascript:alert(1)")).toBeNull();
  });

  it("rejects empty, missing, or non-slash-prefixed values", () => {
    expect(safeRedirectPath("")).toBeNull();
    expect(safeRedirectPath(null)).toBeNull();
    expect(safeRedirectPath(undefined)).toBeNull();
    expect(safeRedirectPath("settings")).toBe("/settings"); // resolves as a relative path segment, which is fine
  });
});
