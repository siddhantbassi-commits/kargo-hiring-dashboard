import { AI_CONFIG } from "./config";
import { generateStructuredJSON } from "./client";
import { buildEmailDraftPrompt, type EmailDraftKind } from "./prompts/email-draft";
import { EMAIL_DRAFT_JSON_SCHEMA, EmailDraftResponseSchema, type EmailDraftResponse } from "./schema";

/**
 * Generates an email draft using the {{candidate_name}} placeholder. Callers
 * MUST substitute the real name server-side (see lib/email/personalize.ts)
 * before ever showing or sending this — this function never sees a real name.
 */
export async function generateEmailDraft(params: {
  kind: EmailDraftKind;
  roleName: string;
  topEvidence: string[];
  sanitizedCvText: string;
}): Promise<EmailDraftResponse> {
  const prompt = buildEmailDraftPrompt(params);
  return generateStructuredJSON({
    prompt,
    responseSchema: EMAIL_DRAFT_JSON_SCHEMA,
    validator: EmailDraftResponseSchema,
    temperature: AI_CONFIG.emailTemperature,
  });
}
