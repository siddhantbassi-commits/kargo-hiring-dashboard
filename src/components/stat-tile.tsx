import type { ReactNode } from "react";

type Accent = "info" | "role-pm" | "role-spm" | "success" | "warning" | "violet" | "neutral";

const ACCENTS: Record<Accent, { fg: string; bg: string }> = {
  neutral: { fg: "var(--accent-2)", bg: "var(--accent-soft)" },
  info: { fg: "var(--info)", bg: "var(--info-bg)" },
  "role-pm": { fg: "var(--role-pm)", bg: "var(--role-pm-bg)" },
  "role-spm": { fg: "var(--role-spm)", bg: "var(--role-spm-bg)" },
  success: { fg: "var(--success)", bg: "var(--success-bg)" },
  warning: { fg: "var(--warning)", bg: "var(--warning-bg)" },
  violet: { fg: "var(--violet)", bg: "var(--violet-bg)" },
};

export function StatTile({
  label,
  value,
  icon,
  accent = "neutral",
  tone = "light",
}: {
  label: string;
  value: number;
  icon: ReactNode;
  accent?: Accent;
  tone?: "light" | "onGradient";
}) {
  const colors = ACCENTS[accent];

  if (tone === "onGradient") {
    return (
      <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 backdrop-blur-sm transition-colors hover:bg-white/[0.14]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-2xl font-semibold tabular-nums tracking-tight text-white">{value}</div>
            <div className="mt-0.5 text-xs text-white/70">{label}</div>
          </div>
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: colors.fg, color: "#fff" }}
          >
            {icon}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3.5 shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</div>
          <div className="mt-0.5 text-xs text-muted">{label}</div>
        </div>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: colors.bg, color: colors.fg }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
