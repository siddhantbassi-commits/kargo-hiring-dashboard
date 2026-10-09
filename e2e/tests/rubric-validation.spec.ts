import { test, expect, type Locator } from "@playwright/test";

// Uses the "authenticated" project's saved session — see playwright.config.ts.
// Every assertion here ends by Cancelling rather than Confirming, so the
// shared rubric_versions data this suite's other tests rely on is never
// actually mutated by this spec.

/**
 * `locator.fill()` right after `page.goto()` can race Next dev's first-visit
 * lazy compile + React hydration of this client component: the fill can
 * land on the DOM before React has attached its controlled-input state,
 * and hydration then reconciles the input back to its original value,
 * silently discarding it. Retrying the fill until it actually sticks absorbs
 * that race without a fixed arbitrary sleep.
 */
async function fillAndConfirm(locator: Locator, value: string) {
  await expect(async () => {
    await locator.fill(value);
    await expect(locator).toHaveValue(value);
  }).toPass({ timeout: 10_000 });
}

test("an unbalanced rubric blocks saving", async ({ page }) => {
  await page.goto("/rubric");

  const pmWeights = page.locator('input[name^="weight__PM__"]');
  const first = pmWeights.first();
  const original = Number(await first.inputValue());
  await fillAndConfirm(first, String(original + 5));

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
  await fillAndConfirm(first, String(firstOriginal + 1));
  await fillAndConfirm(second, String(secondOriginal - 1));

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
