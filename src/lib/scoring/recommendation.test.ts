import { describe, expect, it } from "vitest";
import { getRecommendation } from "./recommendation";

describe("getRecommendation", () => {
  const threshold = 70;

  it("recommends shortlist at or above the threshold", () => {
    expect(getRecommendation(70, threshold)).toBe("shortlist_recommended");
    expect(getRecommendation(95, threshold)).toBe("shortlist_recommended");
  });

  it("recommends review in the borderline zone below the threshold", () => {
    expect(getRecommendation(65, threshold)).toBe("review_recommended");
    expect(getRecommendation(60, threshold)).toBe("review_recommended");
  });

  it("falls back to below-threshold further down", () => {
    expect(getRecommendation(40, threshold)).toBe("below_threshold");
  });

  it("respects a different configured threshold", () => {
    expect(getRecommendation(55, 50)).toBe("shortlist_recommended");
    expect(getRecommendation(45, 50)).toBe("review_recommended");
  });
});
