import { AI_CONFIG } from "./config";
import { generateStructuredJSON } from "./client";
import { buildInterviewBriefPrompt, type CriterionResultForPrompt } from "./prompts/interview-brief";
import { INTERVIEW_BRIEF_JSON_SCHEMA, InterviewBriefResponseSchema } from "./schema";

export async function generateInterviewBrief(params: {
  roleName: string;
  totalScore: number;
  criterionResults: CriterionResultForPrompt[];
  sanitizedCvText: string;
}): Promise<string> {
  const prompt = buildInterviewBriefPrompt(params);
  const result = await generateStructuredJSON({
    prompt,
    responseSchema: INTERVIEW_BRIEF_JSON_SCHEMA,
    validator: InterviewBriefResponseSchema,
    temperature: AI_CONFIG.briefTemperature,
  });
  return result.sentences.join(" ");
}
