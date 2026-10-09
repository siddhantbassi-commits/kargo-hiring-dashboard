import { test, expect } from "@playwright/test";

// Uses the "authenticated" project's saved session — see playwright.config.ts.
// Every assertion here ends by Cancelling rather than Confirming, so the
// shared rubric_versions data this suite's other tests rely on is never
// actually mutated by this spec.

test("an unbalanced rubric blocks saving", async ({ page }) => {
  await page.goto("/rubric");

  const pmWeights = page.locator('input[name^="weight__PM__"]');
  const first = pmWeights.first();
  const original = Number(await first.inputValue());
  await first.fill(String(original + 5));

  await expect(page.getByText("≠ 100%").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Save as rubric/ }).first()).toBeDisabled();
});

test("a balanced change shows a confirm step with an exact diff before saving", async ({ page }) => {
  await page.goto("/rubric");

  const pmWeights = page.locator('input[name^="weight__PM__"]');
  const first = pmWeights.first();
  const second = pmWeights.nth(1);
  const firstOriginal = Number(await first.inputValue());
  const secondOriginal = Number(await second.inputValue());

  // Shift 1 point from the second criterion to the first — total stays 100.
  await first.fill(String(firstOriginal + 1));
  await second.fill(String(secondOriginal - 1));

  const saveButton = page.getByRole("button", { name: /Save as rubric/ }).first();
  await expect(saveButton).toBeEnabled();
  await saveButton.click();

  await expect(
    page.getByText("This changes how every future candidate is scored, immediately.")
  ).toBeVisible();
  await expect(page.getByText(`${firstOriginal}% →`)).toBeVisible();
  await expect(page.getByText(`${secondOriginal}% →`)).toBeVisible();

  // Deliberately cancel — confirming is covered by having already verified
  // this flow manually against production; this spec only needs to prove
  // the safety gate itself appears with a correct diff, not re-mutate data.
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("This changes how every future candidate is scored")).toHaveCount(0);
});
