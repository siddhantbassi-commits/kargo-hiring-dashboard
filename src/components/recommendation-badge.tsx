import { RECOMMENDATION_LABELS, type Recommendation } from "@/lib/scoring/recommendation";

// text-muted (#6b7178) only clears 4.36:1 against bg-neutral-bg (#f1f1ef) —
// under WCAG AA's 4.5:1 floor. It's fine on the white surfaces it's used
// everywhere else; here it needs a touch more contrast against this one
// slightly-darker background instead.
const MUTED_ON_NEUTRAL = "text-[#666b72]";

const STYLES: Record<Recommendation, string> = {
  shortlist_recommended: "bg-success-bg text-success border-success-border",
  review_recommended: "bg-warning-bg text-warning border-warning-border",
  below_threshold: `bg-neutral-bg ${MUTED_ON_NEUTRAL} border-border`,
};

const DOT_STYLES: Record<Recommendation, string> = {
  shortlist_recommended: "bg-success",
  review_recommended: "bg-warning",
  below_threshold: "bg-muted-2",
};

export function RecommendationBadge({ recommendation }: { recommendation: Recommendation | null }) {
  if (!recommendation) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-neutral-bg px-2.5 py-1 text-xs font-medium ${MUTED_ON_NEUTRAL}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-muted-2" />
        Processing
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${STYLES[recommendation]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_STYLES[recommendation]}`} />
      {RECOMMENDATION_LABELS[recommendation]}
    </span>
  );
}
