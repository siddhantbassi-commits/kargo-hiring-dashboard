import Link from "next/link";
import { notFound } from "next/navigation";
import { getCandidateDetail } from "@/lib/queries/candidate-detail";
import { RecommendationBadge } from "@/components/recommendation-badge";
import { CriterionTable } from "./criterion-table";
import { EmailDraftEditor } from "./email-draft-editor";
import { rescoreCandidateAction } from "./actions";

export const maxDuration = 120;

export default async function CandidateDetailPage(props: PageProps<"/candidates/[id]">) {
  const { id } = await props.params;
  const detail = await getCandidateDetail(id);
  if (!detail) notFound();

  const { candidate, pmScore, spmScore, appliedScore, recommendation } = detail;
  const draft = candidate.emailDrafts[0] ?? null;
  const latestSend = candidate.emailSends[0] ?? null;

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
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← Back to dashboard
      </Link>

      {candidate.processingStatus !== "ready" ? (
        candidate.processingStatus === "error" ? (
          <div className="my-6 flex items-center justify-between gap-4 rounded-md border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger">
            <span>Processing failed: {candidate.processingError ?? "Unknown error."}</span>
            <form action={rescoreCandidateAction.bind(null, candidate.id)}>
              <button className="rounded-md border border-danger/30 bg-surface px-3 py-1.5 text-sm font-medium text-danger">
                Retry
              </button>
            </form>
          </div>
        ) : (
          <div className="my-6 rounded-md border border-border bg-neutral-bg px-4 py-3 text-sm text-muted">
            Processing… current stage: {candidate.processingStatus}. Refresh in a moment.
          </div>
        )
      ) : null}

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {candidate.privateDetails?.fullName ?? "Unknown candidate"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Applied for {candidate.appliedRole.name} · {candidate.privateDetails?.email ?? "no email on file"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <RecommendationBadge recommendation={recommendation} />
          <span className="text-3xl font-semibold tabular-nums">
            {appliedScore ? Math.round(appliedScore.totalScore) : "—"}
            <span className="text-base font-normal text-muted">/100</span>
          </span>
        </div>
      </div>

      {candidate.extractionWarning ? (
        <p className="mt-3 text-xs text-warning">Note: {candidate.extractionWarning}</p>
      ) : null}

      {candidate.processingStatus === "ready" ? (
        <form action={rescoreCandidateAction.bind(null, candidate.id)} className="mt-3">
          <button className="text-xs text-muted underline hover:text-foreground">Re-score candidate</button>
        </form>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <CriterionTable
          roleName="Product Manager"
          totalScore={pmScore?.totalScore ?? null}
          overallSummary={pmScore?.overallSummary ?? null}
          criteria={mapCriteria(pmScore)}
        />
        <CriterionTable
          roleName="Senior Product Manager"
          totalScore={spmScore?.totalScore ?? null}
          overallSummary={spmScore?.overallSummary ?? null}
          criteria={mapCriteria(spmScore)}
        />
      </div>

      {candidate.interviewBrief ? (
        <div className="mt-6 rounded-lg border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold">Interview Brief</h2>
          <p className="mt-2 text-sm leading-relaxed">{candidate.interviewBrief.content}</p>
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
