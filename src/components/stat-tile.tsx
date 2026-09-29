import type { ReactNode } from "react";

const ACCENTS: Record<string, string> = {
  neutral: "var(--accent-2)",
  success: "var(--success)",
  warning: "var(--warning)",
};

export function StatTile({
  label,
  value,
  icon,
  accent = "neutral",
}: {
  label: string;
  value: number;
  icon: ReactNode;
  accent?: "neutral" | "success" | "warning";
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface px-4 py-3.5 shadow-[var(--shadow-sm)]">
      <span
        className="absolute inset-y-0 left-0 w-0.5"
        style={{ backgroundColor: ACCENTS[accent] }}
        aria-hidden="true"
      />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</div>
          <div className="mt-0.5 text-xs text-muted">{label}</div>
        </div>
        <div className="text-muted-2" style={{ color: ACCENTS[accent], opacity: 0.85 }}>
          {icon}
        </div>
      </div>
    </div>
  );
}
