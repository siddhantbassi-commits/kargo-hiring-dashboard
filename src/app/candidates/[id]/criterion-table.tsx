interface CriterionRow {
  id: string;
  name: string;
  weight: number;
  rawScore: number;
  evidenceStrength: string;
  reason: string;
  evidence: string[];
}

const STRENGTH_LABEL: Record<string, string> = {
  none: "No evidence",
  weak: "Weak",
  some: "Some evidence",
  strong: "Strong",
  exceptional: "Exceptional",
};

export function CriterionTable({
  roleName,
  totalScore,
  overallSummary,
  criteria,
}: {
  roleName: string;
  totalScore: number | null;
  overallSummary: string | null;
  criteria: CriterionRow[];
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{roleName}</h3>
        <span className="tabular-nums text-lg font-semibold">
          {totalScore !== null ? Math.round(totalScore) : "—"}
          <span className="text-sm font-normal text-muted">/100</span>
        </span>
      </div>
      {overallSummary ? <p className="mt-1 text-sm text-muted">{overallSummary}</p> : null}

      {criteria.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Not yet scored.</p>
      ) : (
        <div className="mt-4 flex flex-col divide-y divide-border">
          {criteria.map((c) => (
            <div key={c.id} className="py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{c.name}</span>
                <span className="text-xs text-muted">weight {c.weight}%</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="tabular-nums text-sm font-semibold">{c.rawScore}</span>
                <span className="text-xs text-muted">/100</span>
                <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                  {STRENGTH_LABEL[c.evidenceStrength] ?? c.evidenceStrength}
                </span>
              </div>
              <p className="mt-1 text-sm">{c.reason}</p>
              {c.evidence.length > 0 ? (
                <ul className="mt-1 list-disc pl-5 text-xs text-muted">
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
