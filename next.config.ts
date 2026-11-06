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

// @prisma/client ships WASM query engines for every database it supports
// (CockroachDB, MySQL, SQL Server, SQLite, ...) and Next's file tracing
// copies all of them into every serverless function (~57 MB each). This app
// uses Postgres via the native library engine, so they are dead weight and
// they multiply across routes x deployments in Vercel's Functions Storage.
// Measured locally: page functions drop from ~80 MB to ~27 MB. The proxy
// trace is not affected by this option (it is bloated because proxy.ts
// imports auth.ts, which imports the DB layer).
const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@prisma/client/runtime/*.wasm-base64.*",
      "node_modules/@prisma/client/runtime/*.wasm",
    ],
  },
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
