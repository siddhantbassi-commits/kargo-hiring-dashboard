import { test, expect } from "@playwright/test";
import { FOUNDER_EMAIL, FOUNDER_PASSWORD } from "../credentials";

// No stored session for this whole file (see playwright.config.ts's
// "unauthenticated" project) — these tests exercise the login flow and the
// auth boundary itself, so they must start logged out.

test("an unauthenticated visitor is redirected to /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("a protected deep link is still blocked when logged out", async ({ page }) => {
  await page.goto("/rubric");
  await expect(page).toHaveURL(/\/login/);
});

test("wrong credentials are rejected with a generic error", async ({ page }) => {
  await page.goto("/login");
  // Not getByLabel("Password") — it also matches the "Show password" toggle
  // button's aria-label (substring match), so it's ambiguous.
  await page.locator("#email").fill(FOUNDER_EMAIL);
  await page.locator("#password").fill("definitely-the-wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText(/invalid/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("correct credentials sign the founder in", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill(FOUNDER_EMAIL);
  await page.locator("#password").fill(FOUNDER_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Candidates" })).toBeVisible();
});
