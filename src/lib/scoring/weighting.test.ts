import { describe, expect, it } from "vitest";
import { computeWeightedTotal, assertWeightsSum100 } from "./weighting";

describe("computeWeightedTotal", () => {
  it("computes the weighted sum matching the PM rubric example", () => {
    const total = computeWeightedTotal([
      { rawScore: 80, weight: 25 }, // Independent Ownership
      { rawScore: 60, weight: 20 }, // Problem Initiative
      { rawScore: 70, weight: 20 }, // Measurable Impact
      { rawScore: 90, weight: 15 }, // Organisational Leverage
      { rawScore: 50, weight: 20 }, // Evidence & Learning
    ]);
    // 20 + 12 + 14 + 13.5 + 10 = 69.5
    expect(total).toBeCloseTo(69.5);
  });

  it("returns 0 for all-zero scores and 100 for all-max scores", () => {
    expect(computeWeightedTotal([{ rawScore: 0, weight: 100 }])).toBe(0);
    expect(computeWeightedTotal([{ rawScore: 100, weight: 60 }, { rawScore: 100, weight: 40 }])).toBe(100);
  });

  it("never lets the AI compute the final score — application code always does the arithmetic", () => {
    // Two independently-generated criterion scores never magically sum past the mathematical weighted value.
    const inputs = [
      { rawScore: 100, weight: 50 },
      { rawScore: 0, weight: 50 },
    ];
    expect(computeWeightedTotal(inputs)).toBe(50);
  });
});

describe("assertWeightsSum100", () => {
  it("passes for weights summing to 100", () => {
    expect(() => assertWeightsSum100([25, 20, 20, 15, 20], "PM")).not.toThrow();
  });

  it("throws for weights not summing to 100", () => {
    expect(() => assertWeightsSum100([25, 20, 20, 15, 21], "PM")).toThrow(/101%/);
  });
});
