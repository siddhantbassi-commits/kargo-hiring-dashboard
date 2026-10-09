import path from "node:path";
import { test, expect } from "@playwright/test";

const SAMPLE_CV = path.join(__dirname, "..", "fixtures", "sample-cv.txt");

// Uses the "authenticated" project's saved session (see playwright.config.ts
// and e2e/setup/auth.setup.ts) — starts already signed in as the founder.

test("upload → score → review → delete a candidate", async ({ page }) => {
  await page.goto("/candidates/new");
  await page.locator('input[name="file"]').setInputFiles(SAMPLE_CV);
  // "Product Manager" is the first/default radio option — leave it checked.
  await page.getByRole("button", { name: "Process Candidate" }).click();

  // The upload server action scores synchronously and redirects straight to
  // the new candidate's detail page once done (see candidates/new/actions.ts).
  await expect(page).toHaveURL(/\/candidates\/[^/]+$/, { timeout: 30_000 });

  // The PII pipeline extracted the real name from the CV, redacted it before
  // ever reaching the (fixture) Gemini call, and it's only shown here from
  // the separate, never-sent-to-the-model candidate_private_details table.
  await expect(page.getByRole("heading", { name: "Priya Sharma" })).toBeVisible();

  // Both rubrics were scored (the app always scores PM and SPM regardless of
  // applied role) — the fixture Gemini server scores every criterion at a
  // uniform 70/100, so the weighted total is 70 for both, regardless of the
  // rubric's actual weight split. Scoped to the headline total's styling
  // (text-lg) rather than a plain text match: since every criterion is also
  // individually scored 70, a plain "70/100" text match also catches each
  // criterion row's own (differently-styled, text-sm) raw-score display.
  await expect(page.getByText("Fixture-generated overall summary for E2E testing.").first()).toHaveCount(1);
  await expect(page.locator("span.text-lg.font-semibold", { hasText: "70" })).toHaveCount(2);

  // The email draft was generated with the {{candidate_name}} placeholder by
  // the (fixture) model and resolved server-side to the real name — never
  // the other way around. See lib/email/personalize.ts.
  const bodyField = page.locator('textarea[name="body"]');
  await expect(bodyField).toBeVisible();
  const bodyText = await bodyField.inputValue();
  expect(bodyText).toContain("Priya");
  expect(bodyText).not.toContain("{{candidate_name}}");

  // Delete: two-step confirm, then gone from the dashboard. Retried as a
  // whole: this candidate's detail page is a brand-new route Turbopack dev
  // hasn't compiled yet, so a click can land before this client component
  // has hydrated and silently do nothing — the retry just repeats the click
  // once hydration has caught up, rather than guessing a fixed wait.
  const confirmDeleteButton = page.getByRole("button", { name: "Confirm Delete" });
  await expect(async () => {
    await page.getByRole("button", { name: "Delete candidate" }).click();
    await expect(confirmDeleteButton).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await confirmDeleteButton.click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText("Priya Sharma")).toHaveCount(0);
});
