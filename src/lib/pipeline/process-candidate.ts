import type { ProcessingStatus, RoleSlug } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getActiveRubricCriteria, getRoleBySlug } from "@/lib/rubric/repository";
import { scoreCandidate } from "@/lib/ai/score-candidate";
import { generateInterviewBrief } from "@/lib/ai/interview-brief";
import { generateEmailDraft } from "@/lib/ai/email-draft";
import { computeWeightedTotal } from "@/lib/scoring/weighting";
import { getRecommendation } from "@/lib/scoring/recommendation";
import { getSetting } from "@/lib/settings";
import { AI_CONFIG } from "@/lib/ai/config";
import type { EmailDraftKind } from "@/lib/ai/prompts/email-draft";

async function setStatus(candidateId: string, status: ProcessingStatus, error: string | null = null) {
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { processingStatus: status, processingError: error },
  });
}

interface MatchedCriterion {
  criterion: { id: string; name: string; weight: number };
  entry: { score: number; reason: string; evidence: string[]; evidenceStrength: string };
}

async function scoreAndPersistRole(candidateId: string, roleSlug: RoleSlug, sanitizedCvText: string) {
  const { role, rubricVersion, criteria } = await getActiveRubricCriteria(roleSlug);

  const aiResult = await scoreCandidate({
    roleName: role.name,
    criteria: criteria.map((c) => ({
      id: c.id,
      key: c.key,
      name: c.name,
      description: c.description,
      weight: c.weight,
    })),
    sanitizedCvText,
  });

  const matched: MatchedCriterion[] = criteria.map((criterion) => {
    const entry =
      aiResult.criteria.find((e) => e.criterionId === criterion.id) ??
      aiResult.criteria.find((e) => e.criterionName.toLowerCase() === criterion.name.toLowerCase());
    if (!entry) {
      throw new Error(
        `Gemini scoring response is missing rubric criterion "${criterion.name}" for ${roleSlug}. Refusing to persist a partial score.`
      );
    }
    return { criterion, entry };
  });

  const totalScore = computeWeightedTotal(
    matched.map((m) => ({ rawScore: m.entry.score, weight: m.criterion.weight }))
  );

  const candidateScore = await prisma.candidateScore.upsert({
    where: {
      candidateId_roleId_rubricVersionId: {
        candidateId,
        roleId: role.id,
        rubricVersionId: rubricVersion.id,
      },
    },
    update: { totalScore, overallSummary: aiResult.overallSummary, model: AI_CONFIG.model },
    create: {
      candidateId,
      roleId: role.id,
      rubricVersionId: rubricVersion.id,
      totalScore,
      overallSummary: aiResult.overallSummary,
      model: AI_CONFIG.model,
    },
  });

  // Idempotent rescoring: this candidate/role/rubricVersion combination is
  // replaced in place rather than accumulating duplicate rows on retry.
  await prisma.criterionScore.deleteMany({ where: { candidateScoreId: candidateScore.id } });
  await prisma.criterionScore.createMany({
    data: matched.map(({ criterion, entry }) => ({
      candidateScoreId: candidateScore.id,
      rubricCriterionId: criterion.id,
      rawScore: Math.round(entry.score),
      weightedScore: Math.round(((entry.score * criterion.weight) / 100) * 100) / 100,
      reason: entry.reason,
      evidence: entry.evidence,
      evidenceStrength: entry.evidenceStrength as never,
    })),
  });

  return { role, totalScore, matched };
}

async function countHigherScoringReadyCandidates(
  roleId: string,
  score: number,
  excludeCandidateId: string
): Promise<number> {
  return prisma.candidateScore.count({
    where: {
      roleId,
      totalScore: { gt: score },
      candidateId: { not: excludeCandidateId },
      candidate: { appliedRoleId: roleId, processingStatus: "ready" },
    },
  });
}

/**
 * The full post-ingest pipeline: score against BOTH rubrics, decide the
 * applied-role recommendation, optionally generate an interview brief, and
 * always generate an editable email draft. Safe to call again on a candidate
 * stuck in "error" — every write here is an upsert/replace, never an append.
 */
export async function processCandidate(candidateId: string): Promise<void> {
  const candidate = await prisma.candidate.findUniqueOrThrow({
    where: { id: candidateId },
    include: { appliedRole: true },
  });

  try {
    await setStatus(candidateId, "scoring");

    const [pmResult, spmResult] = await Promise.all([
      scoreAndPersistRole(candidateId, "PM", candidate.sanitizedCvText),
      scoreAndPersistRole(candidateId, "SPM", candidate.sanitizedCvText),
    ]);

    await setStatus(candidateId, "generating");

    const appliedRoleSlug = candidate.appliedRole.slug;
    const appliedResult = appliedRoleSlug === "PM" ? pmResult : spmResult;

    const threshold = await getSetting("SHORTLIST_THRESHOLD");
    const topN = await getSetting("TOP_CANDIDATES_FOR_BRIEF");
    const recommendation = getRecommendation(appliedResult.totalScore, threshold);

    const higherScoringCount = await countHigherScoringReadyCandidates(
      candidate.appliedRoleId,
      appliedResult.totalScore,
      candidateId
    );
    const qualifiesForBrief = recommendation === "shortlist_recommended" && higherScoringCount < topN;

    if (qualifiesForBrief) {
      const rankedCriteria = [...appliedResult.matched].sort((a, b) => b.entry.score - a.entry.score);
      const briefContent = await generateInterviewBrief({
        roleName: appliedResult.role.name,
        totalScore: appliedResult.totalScore,
        criterionResults: rankedCriteria.map((m) => ({
          criterionName: m.criterion.name,
          score: m.entry.score,
          reason: m.entry.reason,
          evidence: m.entry.evidence,
        })),
        sanitizedCvText: candidate.sanitizedCvText,
      });
      await prisma.interviewBrief.upsert({
        where: { candidateId },
        update: { content: briefContent },
        create: { candidateId, content: briefContent },
      });
    }

    const emailKind: EmailDraftKind = appliedResult.totalScore >= threshold ? "interview_invite" : "rejection";
    const topEvidence = [...appliedResult.matched]
      .sort((a, b) => b.entry.score - a.entry.score)
      .slice(0, 2)
      .flatMap((m) => m.entry.evidence)
      .slice(0, 3);

    const draft = await generateEmailDraft({
      kind: emailKind,
      roleName: appliedResult.role.name,
      topEvidence,
      sanitizedCvText: candidate.sanitizedCvText,
    });

    const existingDraft = await prisma.emailDraft.findFirst({
      where: { candidateId },
      orderBy: { createdAt: "desc" },
    });

    if (!existingDraft) {
      await prisma.emailDraft.create({
        data: { candidateId, emailType: emailKind, subject: draft.subject, body: draft.body },
      });
    } else if (existingDraft.status === "draft") {
      // A prior unsent draft exists (e.g. a rescore) — replace it with the fresh one.
      await prisma.emailDraft.update({
        where: { id: existingDraft.id },
        data: { emailType: emailKind, subject: draft.subject, body: draft.body },
      });
    }
    // If a draft was already sent, it is left untouched — sent history is immutable.

    await setStatus(candidateId, "ready");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown processing error";
    await setStatus(candidateId, "error", message);
    throw error;
  }
}

export async function getRoleId(roleSlug: RoleSlug): Promise<string> {
  const role = await getRoleBySlug(roleSlug);
  return role.id;
}
