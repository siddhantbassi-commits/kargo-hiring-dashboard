export type Recommendation = "shortlist_recommended" | "review_recommended" | "below_threshold";

/** How far below the threshold a score can be and still land in the "review" zone rather than "below". */
export const RECOMMENDATION_BORDERLINE_MARGIN = 10;

export function getRecommendation(appliedRoleScore: number, threshold: number): Recommendation {
  if (appliedRoleScore >= threshold) return "shortlist_recommended";
  if (appliedRoleScore >= threshold - RECOMMENDATION_BORDERLINE_MARGIN) return "review_recommended";
  return "below_threshold";
}

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  shortlist_recommended: "Shortlist Recommended",
  review_recommended: "Review Recommended",
  below_threshold: "Below Threshold",
};
