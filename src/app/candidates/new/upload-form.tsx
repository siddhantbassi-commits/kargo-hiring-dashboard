"use client";

import { useActionState } from "react";
import { uploadCandidateAction, type UploadState } from "./actions";

const initialState: UploadState = {};

const ROLE_OPTIONS = [
  { value: "PM", label: "Product Manager" },
  { value: "SPM", label: "Senior Product Manager" },
] as const;

export function UploadForm() {
  const [state, action, pending] = useActionState(uploadCandidateAction, initialState);

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="file" className="text-sm font-medium text-foreground">
          Candidate CV
        </label>
        <input
          id="file"
          name="file"
          type="file"
          required
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none transition-colors file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-2.5 file:py-1 file:text-sm file:font-medium file:text-accent-2 focus:border-accent-2 focus:ring-2 focus:ring-accent-2/15"
        />
        <p className="text-xs text-muted">PDF, DOCX, or TXT. Max 10MB.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Applied Role</label>
        <div className="grid grid-cols-2 gap-2">
          {ROLE_OPTIONS.map((opt, i) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors has-[:checked]:border-accent-2 has-[:checked]:bg-accent-soft has-[:checked]:font-medium has-[:checked]:text-accent-2"
            >
              <input
                type="radio"
                name="appliedRole"
                value={opt.value}
                defaultChecked={i === 0}
                required
                className="accent-[var(--accent-2)]"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {state.error ? (
        <div className="rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger">
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-px disabled:translate-y-0 disabled:opacity-60"
      >
        {pending ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
            Processing candidate… this can take up to a minute
          </>
        ) : (
          "Process Candidate"
        )}
      </button>
    </form>
  );
}
