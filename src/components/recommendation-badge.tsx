import { RECOMMENDATION_LABELS, type Recommendation } from "@/lib/scoring/recommendation";

const STYLES: Record<Recommendation, string> = {
  shortlist_recommended: "bg-success-bg text-success border-success/20",
  review_recommended: "bg-warning-bg text-warning border-warning/20",
  below_threshold: "bg-neutral-bg text-muted border-border",
};

export function RecommendationBadge({ recommendation }: { recommendation: Recommendation | null }) {
  if (!recommendation) {
    return (
      <span className="inline-flex items-center rounded-full border border-border bg-neutral-bg px-2.5 py-0.5 text-xs font-medium text-muted">
        Processing
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STYLES[recommendation]}`}
    >
      {RECOMMENDATION_LABELS[recommendation]}
    </span>
  );
}
