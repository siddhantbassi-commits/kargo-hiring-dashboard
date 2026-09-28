"use client";

import { useActionState } from "react";
import { updateSettingsAction, type SettingsState } from "./actions";

const initialState: SettingsState = {};

export function SettingsForm({
  shortlistThreshold,
  topCandidatesForBrief,
}: {
  shortlistThreshold: number;
  topCandidatesForBrief: number;
}) {
  const [state, action, pending] = useActionState(updateSettingsAction, initialState);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="shortlistThreshold" className="text-sm font-medium">
          Shortlist Threshold
        </label>
        <p className="text-xs text-muted">
          Applied-role score at or above this value defaults to Shortlist Recommended and drafts an
          interview invite; below it drafts a warm rejection.
        </p>
        <input
          id="shortlistThreshold"
          name="shortlistThreshold"
          type="number"
          min={0}
          max={100}
          defaultValue={shortlistThreshold}
          className="w-32 rounded-md border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="topCandidatesForBrief" className="text-sm font-medium">
          Top Candidates For Brief
        </label>
        <p className="text-xs text-muted">
          Interview briefs are only generated for candidates who rank within this many top scorers per
          role (and are above the shortlist threshold), to keep AI spend bounded.
        </p>
        <input
          id="topCandidatesForBrief"
          name="topCandidatesForBrief"
          type="number"
          min={1}
          max={100}
          defaultValue={topCandidatesForBrief}
          className="w-32 rounded-md border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-success">Settings saved.</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save Settings"}
      </button>
    </form>
  );
}
