import { test as setup, expect } from "@playwright/test";
import { FOUNDER_EMAIL, FOUNDER_PASSWORD, AUTH_STORAGE_STATE_PATH } from "../credentials";

/**
 * Logs in once via the real UI and saves the resulting session so the
 * "authenticated" project's specs (candidate-lifecycle, rubric-validation)
 * can start already signed in, instead of repeating this flow in every
 * test. auth.spec.ts deliberately does NOT depend on this — it tests the
 * login flow and the unauthenticated boundary themselves.
 */
setup("authenticate as the founder", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(FOUNDER_EMAIL);
  await page.getByLabel("Password").fill(FOUNDER_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL("/");
  await page.context().storageState({ path: AUTH_STORAGE_STATE_PATH });
});
