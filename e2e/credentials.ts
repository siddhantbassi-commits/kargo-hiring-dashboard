/**
 * The one founder account used by the E2E suite. playwright.config.ts hashes
 * FOUNDER_PASSWORD and passes FOUNDER_EMAIL/the hash to the app's own env
 * (FOUNDER_EMAIL / FOUNDER_PASSWORD_HASH) — these are test-only credentials,
 * never real ones.
 */
export const FOUNDER_EMAIL = "founder@e2e.test";
export const FOUNDER_PASSWORD = "e2e-test-password-not-real-0000";

export const AUTH_STORAGE_STATE_PATH = "e2e/.auth/founder.json";
