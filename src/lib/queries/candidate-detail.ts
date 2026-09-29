import { prisma } from "@/lib/db";
import { getRecommendation } from "@/lib/scoring/recommendation";
import { getSetting } from "@/lib/settings";

export async function getCandidateDetail(candidateId: string) {
  const [candidate, threshold] = await Promise.all([
    prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        appliedRole: true,
        privateDetails: true,
        interviewBrief: true,
        emailDrafts: { orderBy: { emailType: "asc" } },
        emailSends: { orderBy: { createdAt: "desc" } },
        scores: {
          include: {
            role: true,
            criterionScores: {
              include: { rubricCriterion: true },
              orderBy: { rubricCriterion: { displayOrder: "asc" } },
            },
          },
        },
      },
    }),
    getSetting("SHORTLIST_THRESHOLD"),
  ]);

  if (!candidate) return null;

  const pmScore = candidate.scores.find((s) => s.role.slug === "PM") ?? null;
  const spmScore = candidate.scores.find((s) => s.role.slug === "SPM") ?? null;
  const appliedScore = candidate.appliedRole.slug === "PM" ? pmScore : spmScore;
  const recommendation = appliedScore ? getRecommendation(appliedScore.totalScore, threshold) : null;

  return {
    candidate,
    pmScore,
    spmScore,
    appliedScore,
    recommendation,
    threshold,
  };
}

export type CandidateDetail = NonNullable<Awaited<ReturnType<typeof getCandidateDetail>>>;
