import { defineConfig, devices } from "@playwright/test";
import bcrypt from "bcryptjs";
import { APP_PORT, GEMINI_FIXTURE_PORT, RESEND_FIXTURE_PORT, READINESS_PORT } from "./e2e/ports";
import { FOUNDER_EMAIL, FOUNDER_PASSWORD, AUTH_STORAGE_STATE_PATH } from "./e2e/credentials";

/**
 * A focused critical-path E2E suite (login, the auth boundary, upload →
 * score → delete, the rubric-save confirm gate) — not full UI coverage.
 * Everything external is faked: Gemini and Resend are pointed at local
 * fixture servers (e2e/fixtures/*-server.ts) via GEMINI_BASE_URL /
 * RESEND_BASE_URL, never the real APIs. The app itself still runs for
 * real against a real (ephemeral) Postgres — see README's "End-to-end
 * tests" section and .github/workflows/e2e.yml for the CI wiring.
 *
 * The password hash is computed here, synchronously, specifically so it can
 * be handed to the Next.js webServer's env before that process starts —
 * there's no async setup step before Playwright launches webServer entries.
 */
const FOUNDER_PASSWORD_HASH = bcrypt.hashSync(FOUNDER_PASSWORD, 10);

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/kargo_e2e";

const appEnv = {
  DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL ?? DATABASE_URL,
  FOUNDER_EMAIL,
  FOUNDER_PASSWORD_HASH,
  AUTH_SECRET: "e2e-test-auth-secret-not-for-production-use-00000000",
  GEMINI_API_KEY: "e2e-fixture-key",
  GEMINI_BASE_URL: `http://127.0.0.1:${GEMINI_FIXTURE_PORT}`,
  GEMINI_MODEL: "gemini-e2e-fixture-model",
  RESEND_API_KEY: "e2e-fixture-key",
  RESEND_BASE_URL: `http://127.0.0.1:${RESEND_FIXTURE_PORT}`,
  RESEND_FROM_EMAIL: "hiring@kargo.test",
  NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${APP_PORT}`,
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // one shared DB and one founder session — tests aren't isolated from each other
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"], ["html", { open: "never" }]] : [["list"]],
  timeout: 60_000, // next dev cold-compiles each route on first visit — generous headroom for that, not just network latency
  use: {
    baseURL: `http://127.0.0.1:${APP_PORT}`,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npx tsx e2e/fixtures/gemini-server.ts",
      port: GEMINI_FIXTURE_PORT,
      reuseExistingServer: false,
    },
    {
      command: "npx tsx e2e/fixtures/resend-server.ts",
      port: RESEND_FIXTURE_PORT,
      reuseExistingServer: false,
    },
    {
      // Migrate + seed a fresh DB, then serve the real app — see
      // e2e/start-app.mts. Health-checked on READINESS_PORT, not APP_PORT:
      // that script only opens READINESS_PORT once it has pre-warmed every
      // route the suite visits, so this can't pass while Turbopack is still
      // mid-compile on one of them.
      command: "npm run e2e:prepare-and-serve",
      url: `http://127.0.0.1:${READINESS_PORT}`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: appEnv,
    },
  ],
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "unauthenticated",
      testMatch: /auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "authenticated",
      testMatch: /(candidate-lifecycle|rubric-validation)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: AUTH_STORAGE_STATE_PATH },
      dependencies: ["setup"],
    },
  ],
});
