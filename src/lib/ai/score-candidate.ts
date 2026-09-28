import { AI_CONFIG } from "./config";
import { generateStructuredJSON } from "./client";
import { buildScoreCandidatePrompt, type RubricCriterionForPrompt } from "./prompts/score-candidate";
import { SCORING_RESPONSE_JSON_SCHEMA, ScoringResponseSchema, type ScoringResponse } from "./schema";

export async function scoreCandidate(params: {
  roleName: string;
  criteria: RubricCriterionForPrompt[];
  sanitizedCvText: string;
}): Promise<ScoringResponse> {
  const prompt = buildScoreCandidatePrompt(params);
  return generateStructuredJSON({
    prompt,
    responseSchema: SCORING_RESPONSE_JSON_SCHEMA,
    validator: ScoringResponseSchema,
    temperature: AI_CONFIG.scoringTemperature,
  });
}
