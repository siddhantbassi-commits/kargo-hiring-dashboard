function bandColor(score: number): string {
  if (score >= 70) return "var(--success)";
  if (score >= 55) return "var(--warning)";
  return "var(--muted-2)";
}

export function ScoreRing({ score, size = 84 }: { score: number | null; size?: number }) {
  const stroke = size * 0.09;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = score === null ? 0 : Math.min(100, Math.max(0, score));
  const offset = circumference * (1 - pct / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--neutral-bg)" strokeWidth={stroke} fill="none" />
        {score !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={bandColor(score)}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular-nums font-semibold text-foreground" style={{ fontSize: size * 0.26 }}>
          {score === null ? "—" : Math.round(score)}
        </span>
        <span className="text-muted" style={{ fontSize: size * 0.11 }}>
          / 100
        </span>
      </div>
    </div>
  );
}
