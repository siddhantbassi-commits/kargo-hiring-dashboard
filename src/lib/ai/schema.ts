import { z } from "zod";

export const EVIDENCE_STRENGTHS = ["none", "weak", "some", "strong", "exceptional"] as const;

export const CriterionScoreSchema = z.object({
  criterionId: z.string().min(1),
  criterionName: z.string().min(1),
  score: z.number().min(0).max(100),
  reason: z.string().min(1),
  evidence: z.array(z.string()),
  evidenceStrength: z.enum(EVIDENCE_STRENGTHS),
});

export const ScoringResponseSchema = z.object({
  criteria: z.array(CriterionScoreSchema).min(1),
  overallSummary: z.string().min(1),
  uncertainties: z.array(z.string()).default([]),
});
export type ScoringResponse = z.infer<typeof ScoringResponseSchema>;

export const InterviewBriefResponseSchema = z.object({
  sentences: z.array(z.string().min(1)).length(3),
});
export type InterviewBriefResponse = z.infer<typeof InterviewBriefResponseSchema>;

export const EmailDraftResponseSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
});
export type EmailDraftResponse = z.infer<typeof EmailDraftResponseSchema>;

/** Plain-JSON-Schema mirrors of the Zod shapes above, for Gemini's responseSchema constraint. */
export const SCORING_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    criteria: {
      type: "array",
      items: {
        type: "object",
        properties: {
          criterionId: { type: "string" },
          criterionName: { type: "string" },
          score: { type: "number" },
          reason: { type: "string" },
          evidence: { type: "array", items: { type: "string" } },
          evidenceStrength: { type: "string", enum: [...EVIDENCE_STRENGTHS] },
        },
        required: ["criterionId", "criterionName", "score", "reason", "evidence", "evidenceStrength"],
      },
    },
    overallSummary: { type: "string" },
    uncertainties: { type: "array", items: { type: "string" } },
  },
  required: ["criteria", "overallSummary"],
} as const;

export const INTERVIEW_BRIEF_JSON_SCHEMA = {
  type: "object",
  properties: {
    sentences: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 3,
    },
  },
  required: ["sentences"],
} as const;

export const EMAIL_DRAFT_JSON_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string" },
    body: { type: "string" },
  },
  required: ["subject", "body"],
} as const;
