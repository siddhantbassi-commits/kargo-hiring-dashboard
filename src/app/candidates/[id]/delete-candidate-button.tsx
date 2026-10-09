"use client";

import { useActionState, useState } from "react";
import { deleteCandidateAction, type DeleteState } from "./actions";

const initialState: DeleteState = {};

export function DeleteCandidateButton({ candidateId, name }: { candidateId: string; name: string }) {
  const boundDelete = deleteCandidateAction.bind(null, candidateId);
  const [state, action, pending] = useActionState(boundDelete, initialState);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="mt-6 rounded-2xl border border-danger-border bg-surface p-6 shadow-[var(--shadow-sm)]">
      <h2 className="text-sm font-semibold text-danger">Danger zone</h2>
      <p className="mt-1.5 text-sm text-muted">
        Permanently deletes {name} and everything derived from them — scores, interview brief, and email
        drafts/history. There is no undo. Use this to action a candidate&rsquo;s data-deletion request.
      </p>
      {state.error ? <p className="mt-3 text-sm text-danger">{state.error}</p> : null}
      <div className="mt-4">
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-lg border border-danger-border bg-danger-bg px-3.5 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
          >
            Delete candidate
          </button>
        ) : (
          <form
            action={action}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-danger-border bg-danger-bg px-3.5 py-2.5"
          >
            <span className="text-sm text-danger">
              Permanently delete <span className="font-medium">{name}</span>? This cannot be undone.
            </span>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {pending ? "Deleting…" : "Confirm Delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-sm text-muted hover:text-foreground"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
