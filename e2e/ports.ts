/**
 * Fixed ports for the E2E stack. Shared between playwright.config.ts, the
 * fixture servers, and the Next.js app's env so nothing has to coordinate
 * port numbers at runtime — see README's "End-to-end tests" section.
 */
export const APP_PORT = 3100;
export const GEMINI_FIXTURE_PORT = 4100;
export const RESEND_FIXTURE_PORT = 4101;
// Separate from APP_PORT on purpose — see e2e/start-app.mts's comment.
export const READINESS_PORT = 3199;
