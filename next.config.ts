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

// The Content-Security-Policy header is set dynamically per-request in
// proxy.ts instead (a nonce-based script-src/style-src needs a fresh nonce
// per request, which a static next.config.ts header can't generate).

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: SERVER_ACTION_BODY_SIZE_LIMIT,
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: COMMON_SECURITY_HEADERS }];
  },
};

export default nextConfig;
