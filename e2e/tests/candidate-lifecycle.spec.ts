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
  // rubric's actual weight split.
  await expect(page.getByText("Fixture-generated overall summary for E2E testing.").first()).toHaveCount(1);
  await expect(page.getByText("70/100")).toHaveCount(2);

  // The email draft was generated with the {{candidate_name}} placeholder by
  // the (fixture) model and resolved server-side to the real name — never
  // the other way around. See lib/email/personalize.ts.
  const bodyField = page.locator('textarea[name="body"]');
  await expect(bodyField).toBeVisible();
  const bodyText = await bodyField.inputValue();
  expect(bodyText).toContain("Priya");
  expect(bodyText).not.toContain("{{candidate_name}}");

  // Delete: two-step confirm, then gone from the dashboard.
  await page.getByRole("button", { name: "Delete candidate" }).click();
  await page.getByRole("button", { name: "Confirm Delete" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText("Priya Sharma")).toHaveCount(0);
});
