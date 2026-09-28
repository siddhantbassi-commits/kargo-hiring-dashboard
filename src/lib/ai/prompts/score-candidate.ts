import { PROMPT_INJECTION_DEFENSE, SCORING_ANCHORS, wrapUntrustedCandidateText } from "./shared";

export interface RubricCriterionForPrompt {
  id: string;
  key: string;
  name: string;
  description: string;
  weight: number;
}

export function buildScoreCandidatePrompt(params: {
  roleName: string;
  criteria: RubricCriterionForPrompt[];
  sanitizedCvText: string;
}): string {
  const { roleName, criteria, sanitizedCvText } = params;

  const rubricList = criteria
    .map(
      (c) =>
        `- id="${c.id}" name="${c.name}" weight=${c.weight}%\n  What a strong candidate looks like: ${c.description}`
    )
    .join("\n");

  return `
You are scoring a job candidate's CV against Kargo's internal hiring rubric for the ${roleName} role.

${PROMPT_INJECTION_DEFENSE}

TASK
Score the candidate against EACH of the following rubric criteria, independently, using ONLY evidence
present in the CV text below. This rubric was derived from patterns among Kargo's successful past hires,
not from generic job-description matching — do not reward years of experience, job titles, employer
brand, university prestige, an MBA, or generic PM keywords unless they form part of concrete evidence
for one of these specific criteria. Missing evidence should score lower, never be guessed or assumed.

RUBRIC CRITERIA (${roleName})
${rubricList}

${SCORING_ANCHORS}

For each criterion, return:
- criterionId: exactly the id given above
- criterionName: exactly the name given above
- score: 0-100 integer per the anchors above
- reason: one concise sentence explaining the score, referencing what is (or is not) present
- evidence: an array of 0-3 short quotes or close paraphrases from the CV text that most directly support the score. Empty array if there is no supporting evidence.
- evidenceStrength: one of "none", "weak", "some", "strong", "exceptional"

Also return:
- overallSummary: 1-2 sentences summarizing the candidate's fit against this rubric as a whole
- uncertainties: any specific things you could not assess confidently from the CV text (can be empty)

Do NOT calculate a final weighted score yourself — that is computed deterministically in application code.

${wrapUntrustedCandidateText("CANDIDATE CV TEXT", sanitizedCvText)}
`.trim();
}
