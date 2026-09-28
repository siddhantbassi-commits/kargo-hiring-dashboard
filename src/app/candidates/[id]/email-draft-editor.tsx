"use client";

import { useActionState, useState } from "react";
import { saveDraftAction, sendEmailAction, type SaveDraftState, type SendState } from "./actions";

export interface EmailDraftEditorProps {
  candidateId: string;
  draftId: string;
  emailType: "interview_invite" | "rejection";
  subject: string;
  body: string;
  recipientEmail: string | null;
  alreadySent: boolean;
  sentAt: string | null;
  sendError: string | null;
}

const initialSaveState: SaveDraftState = {};
const initialSendState: SendState = {};

export function EmailDraftEditor(props: EmailDraftEditorProps) {
  const boundSave = saveDraftAction.bind(null, props.candidateId, props.draftId);
  const boundSend = sendEmailAction.bind(null, props.candidateId);

  const [saveState, saveAction, savePending] = useActionState(boundSave, initialSaveState);
  const [sendState, sendAction, sendPending] = useActionState(boundSend, initialSendState);
  const [confirming, setConfirming] = useState(false);
  const [emailType, setEmailType] = useState(props.emailType);

  if (props.alreadySent) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold">Draft Email</h2>
        <div className="mt-3 rounded-md border border-success/20 bg-success-bg px-3 py-2 text-sm text-success">
          Sent {props.sentAt ? new Date(props.sentAt).toLocaleString() : ""}
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div className="font-medium">{props.subject}</div>
          <div className="whitespace-pre-wrap text-muted">{props.body}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Draft Email</h2>
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setEmailType("interview_invite")}
            className={`rounded px-2 py-1 ${emailType === "interview_invite" ? "bg-accent text-accent-foreground" : "text-muted"}`}
          >
            Interview Invite
          </button>
          <button
            type="button"
            onClick={() => setEmailType("rejection")}
            className={`rounded px-2 py-1 ${emailType === "rejection" ? "bg-accent text-accent-foreground" : "text-muted"}`}
          >
            Rejection
          </button>
        </div>
      </div>

      <form action={saveAction} className="mt-4 flex flex-col gap-3">
        <input type="hidden" name="emailType" value={emailType} />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Subject</label>
          <input
            name="subject"
            defaultValue={props.subject}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Body</label>
          <textarea
            name="body"
            defaultValue={props.body}
            rows={8}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
          />
        </div>
        {saveState.error ? <p className="text-sm text-danger">{saveState.error}</p> : null}
        {saveState.savedAt ? <p className="text-sm text-success">Draft saved.</p> : null}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={savePending}
            className="rounded-md border border-border bg-neutral-bg px-3 py-2 text-sm font-medium disabled:opacity-60"
          >
            {savePending ? "Saving…" : "Save Draft"}
          </button>
          {!props.recipientEmail ? (
            <span className="text-xs text-warning">
              No email address on file — sending is disabled until one is added.
            </span>
          ) : null}
        </div>
      </form>

      <div className="mt-4 border-t border-border pt-4">
        {sendState.error ? (
          <p className="mb-2 text-sm text-danger">{sendState.error}</p>
        ) : null}
        {!confirming ? (
          <button
            type="button"
            disabled={!props.recipientEmail}
            onClick={() => setConfirming(true)}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-40"
          >
            Send Email
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-md border border-border bg-neutral-bg px-3 py-2">
            <span className="text-sm">
              Send to <span className="font-medium">{props.recipientEmail}</span>?
            </span>
            <form action={sendAction}>
              <button
                type="submit"
                disabled={sendPending}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-60"
              >
                {sendPending ? "Sending…" : "Confirm Send"}
              </button>
            </form>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-sm text-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
