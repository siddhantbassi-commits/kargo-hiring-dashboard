/**
 * Reduces a callbackUrl down to just its path + query, discarding whatever
 * scheme/host was embedded (our own, per proxy.ts's absolute redirect, or an
 * attacker's). A callbackUrl is just a query param an attacker fully
 * controls, so this is the one thing standing between "redirect back where
 * you came from" and an open-redirect phishing vector
 * (e.g. ?callbackUrl=https://evil.example) — never reuse the host/scheme
 * from user input, only ever the path, which is always same-origin by
 * construction once resolved against our own page.
 */
export function safeRedirectPath(value: string | null | undefined): string | null {
  if (!value) return null;
  let parsed: URL;
  try {
    parsed = new URL(value, "http://placeholder.invalid");
  } catch {
    return null;
  }
  if (!parsed.pathname.startsWith("/")) return null;
  return parsed.pathname + parsed.search;
}
