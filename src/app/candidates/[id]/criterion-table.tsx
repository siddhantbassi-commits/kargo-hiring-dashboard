interface CriterionRow {
  id: string;
  name: string;
  weight: number;
  rawScore: number;
  evidenceStrength: string;
  reason: string;
  evidence: string[];
}

const STRENGTH_STYLE: Record<string, string> = {
  none: "border-border text-muted",
  weak: "border-border text-muted",
  some: "border-warning-border bg-warning-bg text-warning",
  strong: "border-success-border bg-success-bg text-success",
  exceptional: "border-success-border bg-success-bg text-success",
};

const STRENGTH_LABEL: Record<string, string> = {
  none: "No evidence",
  weak: "Weak",
  some: "Some evidence",
  strong: "Strong",
  exceptional: "Exceptional",
};

function barColor(score: number): string {
  if (score >= 70) return "var(--success)";
  if (score >= 55) return "var(--warning)";
  return "var(--muted-2)";
}

export function CriterionTable({
  roleName,
  totalScore,
  overallSummary,
  criteria,
  isAppliedRole = false,
}: {
  roleName: string;
  totalScore: number | null;
  overallSummary: string | null;
  criteria: CriterionRow[];
  isAppliedRole?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-surface p-6 shadow-[var(--shadow-sm)] ${
        isAppliedRole ? "border-accent-2/40 ring-1 ring-accent-2/15" : "border-border"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">{roleName}</h2>
          {isAppliedRole ? (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-2">
              Applied Role
            </span>
          ) : null}
        </div>
        <span className="tabular-nums text-lg font-semibold text-foreground">
          {totalScore !== null ? Math.round(totalScore) : "—"}
          <span className="text-sm font-normal text-muted">/100</span>
        </span>
      </div>
      {overallSummary ? <p className="mt-1.5 text-sm leading-relaxed text-muted">{overallSummary}</p> : null}

      {criteria.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Not yet scored.</p>
      ) : (
        <div className="mt-4 flex flex-col divide-y divide-border">
          {criteria.map((c) => (
            <div key={c.id} className="py-3.5 first:pt-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{c.name}</span>
                <span className="shrink-0 text-xs text-muted-2">weight {c.weight}%</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1 w-14 overflow-hidden rounded-full bg-neutral-bg">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, c.rawScore))}%`, backgroundColor: barColor(c.rawScore) }}
                  />
                </div>
                <span className="tabular-nums text-sm font-semibold text-foreground">{c.rawScore}</span>
                <span className="text-xs text-muted-2">/100</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                    STRENGTH_STYLE[c.evidenceStrength] ?? "border-border text-muted"
                  }`}
                >
                  {STRENGTH_LABEL[c.evidenceStrength] ?? c.evidenceStrength}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-foreground">{c.reason}</p>
              {c.evidence.length > 0 ? (
                <ul className="mt-1.5 space-y-1 border-l-2 border-border pl-3 text-xs italic text-muted">
                  {c.evidence.map((e, i) => (
                    <li key={i}>&ldquo;{e}&rdquo;</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
