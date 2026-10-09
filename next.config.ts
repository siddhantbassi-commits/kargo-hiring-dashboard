import type { NextConfig } from "next";

// CV uploads are capped at 10MB in lib/extraction (MAX_CV_BYTES) — Server
// Actions default to a 1MB body limit, which silently rejected anything
// over that before this override. Padded above 10MB for multipart overhead.
const SERVER_ACTION_BODY_SIZE_LIMIT = "12mb";

const COMMON_SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // This is an internal admin tool with no legitimate reason to be framed.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

// Everything here is same-origin: self-hosted fonts (next/font), no client-side
// calls to Gemini/Resend (server-only), no external scripts or analytics. A
// stricter nonce-based script-src is possible later; 'unsafe-inline' is kept
// for Next's App Router hydration scripts, but script-src is still locked to
// 'self' so an injected <script src="external"> would still be blocked.
// Left out in dev so Turbopack's HMR isn't fighting a strict CSP.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: SERVER_ACTION_BODY_SIZE_LIMIT,
    },
  },
  async headers() {
    const headers = [...COMMON_SECURITY_HEADERS];
    if (process.env.NODE_ENV === "production") {
      headers.push({ key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY });
    }
    return [{ source: "/(.*)", headers }];
  },
};

export default nextConfig;
