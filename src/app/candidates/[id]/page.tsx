import Link from "next/link";
import { notFound } from "next/navigation";
import { getCandidateDetail } from "@/lib/queries/candidate-detail";
import { RecommendationBadge } from "@/components/recommendation-badge";
import { Avatar } from "@/components/avatar";
import { ScoreRing } from "@/components/score-ring";
import { CriterionTable } from "./criterion-table";
import { EmailDraftEditor } from "./email-draft-editor";
import { rescoreCandidateAction } from "./actions";

export const maxDuration = 120;

const STAGE_LABELS: Record<string, string> = {
  uploaded: "Queued",
  extracting: "Extracting text",
  redacting: "Removing PII",
  scoring: "Scoring against both rubrics",
  generating: "Generating brief & email",
};

export default async function CandidateDetailPage(props: PageProps<"/candidates/[id]">) {
  const { id } = await props.params;
  const detail = await getCandidateDetail(id);
  if (!detail) notFound();

  const { candidate, pmScore, spmScore, appliedScore, recommendation } = detail;
  const draft = candidate.emailDrafts[0] ?? null;
  const latestSend = candidate.emailSends[0] ?? null;
  const name = candidate.privateDetails?.fullName ?? "Unknown candidate";

  const mapCriteria = (score: typeof pmScore) =>
    (score?.criterionScores ?? []).map((cs) => ({
      id: cs.id,
      name: cs.rubricCriterion.name,
      weight: cs.rubricCriterion.weight,
      rawScore: cs.rawScore,
      evidenceStrength: cs.evidenceStrength,
      reason: cs.reason,
      evidence: cs.evidence,
    }));

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        ← Back to dashboard
      </Link>

      {candidate.processingStatus !== "ready" ? (
        candidate.processingStatus === "error" ? (
          <div className="my-6 flex items-center justify-between gap-4 rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
            <span>Processing failed: {candidate.processingError ?? "Unknown error."}</span>
            <form action={rescoreCandidateAction.bind(null, candidate.id)}>
              <button className="shrink-0 rounded-md border border-danger-border bg-surface px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger-bg">
                Retry
              </button>
            </form>
          </div>
        ) : (
          <div className="my-6 flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted shadow-[var(--shadow-sm)]">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-accent-2" />
            {STAGE_LABELS[candidate.processingStatus] ?? candidate.processingStatus} — refresh in a moment.
          </div>
        )
      ) : null}

      <div className="mt-5 flex items-start justify-between gap-6 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
        <div className="flex items-start gap-4">
          <Avatar name={name} size={52} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{name}</h1>
            <p className="mt-1 text-sm text-muted">
              Applied for {candidate.appliedRole.name} · {candidate.privateDetails?.email ?? "no email on file"}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <RecommendationBadge recommendation={recommendation} />
              {candidate.processingStatus === "ready" ? (
                <form action={rescoreCandidateAction.bind(null, candidate.id)}>
                  <button className="text-xs text-muted underline-offset-2 hover:text-foreground hover:underline">
                    Re-score candidate
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
        <ScoreRing score={appliedScore ? appliedScore.totalScore : null} />
      </div>

      {candidate.extractionWarning ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-warning">
          <span className="h-1 w-1 rounded-full bg-warning" /> {candidate.extractionWarning}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <CriterionTable
          roleName="Product Manager"
          totalScore={pmScore?.totalScore ?? null}
          overallSummary={pmScore?.overallSummary ?? null}
          criteria={mapCriteria(pmScore)}
          isAppliedRole={candidate.appliedRole.slug === "PM"}
        />
        <CriterionTable
          roleName="Senior Product Manager"
          totalScore={spmScore?.totalScore ?? null}
          overallSummary={spmScore?.overallSummary ?? null}
          criteria={mapCriteria(spmScore)}
          isAppliedRole={candidate.appliedRole.slug === "SPM"}
        />
      </div>

      {candidate.interviewBrief ? (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-2" />
            Interview Brief
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-foreground">{candidate.interviewBrief.content}</p>
        </div>
      ) : null}

      {draft ? (
        <div className="mt-6">
          <EmailDraftEditor
            candidateId={candidate.id}
            draftId={draft.id}
            emailType={draft.emailType}
            subject={draft.editedSubject ?? draft.subject}
            body={draft.editedBody ?? draft.body}
            recipientEmail={candidate.privateDetails?.email ?? null}
            alreadySent={draft.status === "sent"}
            sentAt={latestSend?.sentAt?.toISOString() ?? null}
            sendError={latestSend?.status === "failed" ? latestSend.error : null}
          />
        </div>
      ) : candidate.processingStatus === "ready" ? (
        <p className="mt-6 text-sm text-muted">No email draft was generated for this candidate.</p>
      ) : null}
    </div>
  );
}
