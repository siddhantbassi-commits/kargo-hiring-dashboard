"use client";

import { useActionState, useState } from "react";
import { updateRubricWeightsAction, type RubricState } from "./actions";

export interface RubricCriterionInput {
  key: string;
  name: string;
  description: string;
  weight: number;
}

const initialState: RubricState = {};

function RoleCard({
  roleLabel,
  roleKey,
  accent,
  criteria,
  weights,
  onChange,
}: {
  roleLabel: string;
  roleKey: "PM" | "SPM";
  accent: string;
  criteria: RubricCriterionInput[];
  weights: Record<string, number>;
  onChange: (key: string, value: number) => void;
}) {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  const valid = sum === 100;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">{roleLabel}</h2>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums ${
            valid
              ? "border-success-border bg-success-bg text-success"
              : "border-danger-border bg-danger-bg text-danger"
          }`}
        >
          {sum}% {valid ? "" : "≠ 100%"}
        </span>
      </div>

      <div className="mt-4 flex flex-col divide-y divide-border">
        {criteria.map((c) => (
          <div key={c.key} className="flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{c.name}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{c.description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                name={`weight__${roleKey}__${c.key}`}
                value={weights[c.key]}
                onChange={(e) => onChange(c.key, Number(e.target.value))}
                className="w-16 rounded-lg border border-border bg-surface px-2 py-1.5 text-right text-sm font-semibold tabular-nums outline-none transition-colors focus:border-accent-2 focus:ring-2 focus:ring-accent-2/15"
              />
              <span className="text-sm text-muted">%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RubricForm({
  pm,
  spm,
  version,
}: {
  pm: RubricCriterionInput[];
  spm: RubricCriterionInput[];
  version: number;
}) {
  const [pmWeights, setPmWeights] = useState<Record<string, number>>(() =>
    Object.fromEntries(pm.map((c) => [c.key, c.weight]))
  );
  const [spmWeights, setSpmWeights] = useState<Record<string, number>>(() =>
    Object.fromEntries(spm.map((c) => [c.key, c.weight]))
  );
  const [state, formAction, pending] = useActionState(updateRubricWeightsAction, initialState);

  const pmSum = Object.values(pmWeights).reduce((a, b) => a + b, 0);
  const spmSum = Object.values(spmWeights).reduce((a, b) => a + b, 0);
  const bothValid = pmSum === 100 && spmSum === 100;

  return (
    <form action={formAction}>
      <div className="grid gap-5 lg:grid-cols-2">
        <RoleCard
          roleLabel="Product Manager"
          roleKey="PM"
          accent="var(--role-pm)"
          criteria={pm}
          weights={pmWeights}
          onChange={(key, value) => setPmWeights((w) => ({ ...w, [key]: value }))}
        />
        <RoleCard
          roleLabel="Senior Product Manager"
          roleKey="SPM"
          accent="var(--role-spm)"
          criteria={spm}
          weights={spmWeights}
          onChange={(key, value) => setSpmWeights((w) => ({ ...w, [key]: value }))}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || !bothValid}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-px disabled:translate-y-0 disabled:opacity-40"
        >
          {pending ? "Saving…" : `Save as rubric v${version + 1}`}
        </button>
        {!bothValid ? (
          <span className="text-xs text-warning">Each role&rsquo;s weights must total exactly 100% before saving.</span>
        ) : null}
        {state.error ? <span className="text-sm text-danger">{state.error}</span> : null}
        {state.success ? (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Saved as rubric v{state.version}. New
            scores will use it; past candidates keep the rubric that scored them.
          </span>
        ) : null}
      </div>
    </form>
  );
}
