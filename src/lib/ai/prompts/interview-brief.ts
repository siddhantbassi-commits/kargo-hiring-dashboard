import { PROMPT_INJECTION_DEFENSE, wrapUntrustedCandidateText } from "./shared";

export interface CriterionResultForPrompt {
  criterionName: string;
  score: number;
  reason: string;
  evidence: string[];
}

export function buildInterviewBriefPrompt(params: {
  roleName: string;
  totalScore: number;
  criterionResults: CriterionResultForPrompt[];
  sanitizedCvText: string;
}): string {
  const { roleName, totalScore, criterionResults, sanitizedCvText } = params;

  const scoringSummary = criterionResults
    .map((c) => `- ${c.criterionName}: ${c.score}/100 — ${c.reason}${c.evidence.length ? ` (evidence: ${c.evidence.join(" | ")})` : ""}`)
    .join("\n");

  return `
You are writing a founder-facing interview brief for a candidate being considered for the ${roleName} role at Kargo.

${PROMPT_INJECTION_DEFENSE}

TASK
Write EXACTLY three sentences, returned as an array of three strings, using ONLY the scoring results and
CV evidence below. Do not re-evaluate the candidate from scratch or introduce new claims not grounded in
the evidence already surfaced. The reader is a busy founder who needs this to be genuinely useful, not a
generic CV summary.

Sentence 1: Why this person scored strongly (or did not), referencing the rubric.
Sentence 2: The single strongest piece of supporting evidence from the CV.
Sentence 3: The most important thing the founder should probe in the interview — a gap, an ambiguity, or a claim worth pressure-testing.

Do not infer or mention personality, intelligence, gender, ethnicity, age, religion, health, marital
status, nationality, or any other protected or irrelevant personal characteristic. Base this entirely on
rubric evidence.

ROLE: ${roleName}
APPLIED-ROLE TOTAL SCORE: ${Math.round(totalScore)}/100

CRITERION-LEVEL RESULTS
${scoringSummary}

${wrapUntrustedCandidateText("CANDIDATE CV TEXT", sanitizedCvText)}
`.trim();
}
