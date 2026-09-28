export function ScoreBar({ score, label }: { score: number | null; label?: string }) {
  if (score === null) {
    return <span className="text-sm text-muted">—</span>;
  }
  const rounded = Math.round(score);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-bg">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${Math.min(100, Math.max(0, rounded))}%` }}
        />
      </div>
      <span className="tabular-nums text-sm font-medium">{rounded}</span>
      {label ? <span className="text-xs text-muted">{label}</span> : null}
    </div>
  );
}
