"use client";

import { useActionState, useState } from "react";
import { saveDraftAction, sendEmailAction, type SaveDraftState, type SendState } from "./actions";

export type EmailKind = "interview_invite" | "rejection";

export interface EmailDraftVariant {
  id: string;
  subject: string;
  body: string;
  status: "draft" | "sending" | "sent" | "failed";
}

export interface EmailDraftEditorProps {
  candidateId: string;
  defaultEmailType: EmailKind;
  interviewInvite: EmailDraftVariant | null;
  rejection: EmailDraftVariant | null;
  recipientEmail: string | null;
  sentAt: string | null;
  sendError: string | null;
}

const initialSaveState: SaveDraftState = {};
const initialSendState: SendState = {};

const inputClass =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent-2 focus:ring-2 focus:ring-accent-2/15";

const KIND_LABELS: Record<EmailKind, string> = {
  interview_invite: "Interview Invite",
  rejection: "Rejection",
};

export function EmailDraftEditor(props: EmailDraftEditorProps) {
  const boundSave = saveDraftAction.bind(null, props.candidateId);
  const boundSend = sendEmailAction.bind(null, props.candidateId);

  const [saveState, saveAction, savePending] = useActionState(boundSave, initialSaveState);
  const [sendState, sendAction, sendPending] = useActionState(boundSend, initialSendState);
  const [confirming, setConfirming] = useState(false);
  const [emailType, setEmailType] = useState<EmailKind>(props.defaultEmailType);

  const variants: Record<EmailKind, EmailDraftVariant | null> = {
    interview_invite: props.interviewInvite,
    rejection: props.rejection,
  };

  const [drafts, setDrafts] = useState<Record<EmailKind, { subject: string; body: string }>>({
    interview_invite: {
      subject: props.interviewInvite?.subject ?? "",
      body: props.interviewInvite?.body ?? "",
    },
    rejection: {
      subject: props.rejection?.subject ?? "",
      body: props.rejection?.body ?? "",
    },
  });

  const sentVariant =
    (props.interviewInvite?.status === "sent" ? { kind: "interview_invite" as const, ...props.interviewInvite } : null) ??
    (props.rejection?.status === "sent" ? { kind: "rejection" as const, ...props.rejection } : null);

  if (sentVariant) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Draft Email</h2>
          <span className="rounded-full border border-border bg-surface-hover px-2.5 py-1 text-xs font-medium text-muted">
            {KIND_LABELS[sentVariant.kind]}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-success-border bg-success-bg px-3 py-2 text-sm text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Sent {props.sentAt ? new Date(props.sentAt).toLocaleString() : ""}
        </div>
        <div className="mt-4 space-y-2 rounded-lg bg-surface-hover p-4 text-sm">
          <div className="font-medium text-foreground">{sentVariant.subject}</div>
          <div className="whitespace-pre-wrap text-muted">{sentVariant.body}</div>
        </div>
      </div>
    );
  }

  const current = variants[emailType];
  const currentText = drafts[emailType];

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Draft Email</h2>
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-hover p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setEmailType("interview_invite")}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              emailType === "interview_invite" ? "bg-accent text-accent-foreground shadow-[var(--shadow-sm)]" : "text-muted hover:text-foreground"
            }`}
          >
            Interview Invite
          </button>
          <button
            type="button"
            onClick={() => setEmailType("rejection")}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              emailType === "rejection" ? "bg-accent text-accent-foreground shadow-[var(--shadow-sm)]" : "text-muted hover:text-foreground"
            }`}
          >
            Rejection
          </button>
        </div>
      </div>

      {!current ? (
        <p className="mt-4 text-sm text-muted">
          No {KIND_LABELS[emailType].toLowerCase()} draft has been generated for this candidate yet. Re-score
          the candidate to generate one.
        </p>
      ) : (
        <>
          <form action={saveAction} className="mt-4 flex flex-col gap-3">
            <input type="hidden" name="draftId" value={current.id} />
            <div className="flex flex-col gap-1">
              <label htmlFor="email-draft-subject" className="text-xs font-medium text-muted">Subject</label>
              <input
                id="email-draft-subject"
                name="subject"
                value={currentText.subject}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [emailType]: { ...d[emailType], subject: e.target.value } }))
                }
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="email-draft-body" className="text-xs font-medium text-muted">Body</label>
              <textarea
                id="email-draft-body"
                name="body"
                value={currentText.body}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [emailType]: { ...d[emailType], body: e.target.value } }))
                }
                rows={8}
                className={`${inputClass} resize-y leading-relaxed`}
              />
            </div>
            {saveState.error ? <p className="text-sm text-danger">{saveState.error}</p> : null}
            {saveState.savedAt ? (
              <p className="flex items-center gap-1.5 text-sm text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Draft saved.
              </p>
            ) : null}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={savePending}
                className="rounded-lg border border-border bg-surface-hover px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-neutral-bg disabled:opacity-60"
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

          <div className="mt-5 border-t border-border pt-5">
            {sendState.error ? <p className="mb-2 text-sm text-danger">{sendState.error}</p> : null}
            {!confirming ? (
              <button
                type="button"
                disabled={!props.recipientEmail}
                onClick={() => setConfirming(true)}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-px disabled:translate-y-0 disabled:opacity-40"
              >
                Send {KIND_LABELS[emailType]}
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-accent-2/25 bg-accent-soft px-3.5 py-2.5">
                <span className="text-sm text-foreground">
                  Send the <span className="font-medium">{KIND_LABELS[emailType].toLowerCase()}</span> email to{" "}
                  <span className="font-medium">{props.recipientEmail}</span>?
                </span>
                <form action={sendAction}>
                  <input type="hidden" name="draftId" value={current.id} />
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
        </>
      )}
    </div>
  );
}
