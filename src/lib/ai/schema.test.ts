import { describe, expect, it } from "vitest";
import {
  ScoringResponseSchema,
  InterviewBriefResponseSchema,
  EmailDraftResponseSchema,
} from "./schema";

describe("ScoringResponseSchema", () => {
  const valid = {
    criteria: [
      {
        criterionId: "pm-1",
        criterionName: "Independent Ownership",
        score: 82,
        reason: "Owned a feature end to end.",
        evidence: ["Shipped X independently"],
        evidenceStrength: "strong",
      },
    ],
    overallSummary: "Strong candidate overall.",
    uncertainties: [],
  };

  it("accepts a well-formed response", () => {
    expect(ScoringResponseSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a score outside 0-100", () => {
    const bad = { ...valid, criteria: [{ ...valid.criteria[0], score: 150 }] };
    expect(ScoringResponseSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an invalid evidenceStrength enum value", () => {
    const bad = { ...valid, criteria: [{ ...valid.criteria[0], evidenceStrength: "amazing" }] };
    expect(ScoringResponseSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a response missing overallSummary", () => {
    const { overallSummary: _drop, ...bad } = valid;
    expect(ScoringResponseSchema.safeParse(bad).success).toBe(false);
  });

  it("defaults uncertainties to an empty array when omitted", () => {
    const { uncertainties: _drop, ...withoutUncertainties } = valid;
    const result = ScoringResponseSchema.safeParse(withoutUncertainties);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.uncertainties).toEqual([]);
  });
});

describe("InterviewBriefResponseSchema", () => {
  it("requires exactly 3 sentences", () => {
    expect(
      InterviewBriefResponseSchema.safeParse({ sentences: ["one", "two", "three"] }).success
    ).toBe(true);
    expect(InterviewBriefResponseSchema.safeParse({ sentences: ["one", "two"] }).success).toBe(false);
    expect(
      InterviewBriefResponseSchema.safeParse({ sentences: ["one", "two", "three", "four"] }).success
    ).toBe(false);
  });
});

describe("EmailDraftResponseSchema", () => {
  it("requires both subject and body", () => {
    expect(EmailDraftResponseSchema.safeParse({ subject: "Hi", body: "Body" }).success).toBe(true);
    expect(EmailDraftResponseSchema.safeParse({ subject: "Hi" }).success).toBe(false);
  });
});
