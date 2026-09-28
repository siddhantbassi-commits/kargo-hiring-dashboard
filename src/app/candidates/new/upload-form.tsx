"use client";

import { useActionState } from "react";
import { uploadCandidateAction, type UploadState } from "./actions";

const initialState: UploadState = {};

export function UploadForm() {
  const [state, action, pending] = useActionState(uploadCandidateAction, initialState);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="file" className="text-sm font-medium">
          Candidate CV
        </label>
        <input
          id="file"
          name="file"
          type="file"
          required
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-neutral-bg file:px-2 file:py-1 file:text-sm"
        />
        <p className="text-xs text-muted">PDF, DOCX, or TXT. Max 10MB.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Applied Role</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="appliedRole" value="PM" defaultChecked required /> Product Manager
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="appliedRole" value="SPM" /> Senior Product Manager
          </label>
        </div>
      </div>

      {state.error ? (
        <div className="rounded-md border border-danger/20 bg-danger-bg px-3 py-2 text-sm text-danger">
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Processing candidate… this can take up to a minute" : "Process Candidate"}
      </button>
    </form>
  );
}
