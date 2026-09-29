function bandColor(score: number): string {
  if (score >= 70) return "var(--success)";
  if (score >= 55) return "var(--warning)";
  return "var(--muted-2)";
}

export function ScoreBar({ score, label }: { score: number | null; label?: string }) {
  if (score === null) {
    return <span className="text-sm text-muted-2">—</span>;
  }
  const rounded = Math.round(score);
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 shrink-0 tabular-nums text-sm font-semibold text-foreground">{rounded}</span>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-bg">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, Math.max(0, rounded))}%`, backgroundColor: bandColor(rounded) }}
        />
      </div>
      {label ? <span className="text-xs text-muted">{label}</span> : null}
    </div>
  );
}
