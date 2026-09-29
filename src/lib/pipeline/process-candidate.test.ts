import { describe, expect, it, vi, beforeEach } from "vitest";

// --- Fixtures -------------------------------------------------------------

const PM_ROLE = { id: "role-pm", slug: "PM", name: "Product Manager" };
const SPM_ROLE = { id: "role-spm", slug: "SPM", name: "Senior Product Manager" };
const RUBRIC_VERSION = { id: "rubric-v1", version: 1 };

const PM_CRITERIA = [{ id: "pm-crit-1", key: "ownership", name: "Independent Ownership", description: "d", weight: 100, displayOrder: 0 }];
const SPM_CRITERIA = [{ id: "spm-crit-1", key: "ownership", name: "Independent Ownership", description: "d", weight: 100, displayOrder: 0 }];

vi.mock("@/lib/rubric/repository", () => ({
  getActiveRubricCriteria: vi.fn(async (roleSlug: "PM" | "SPM") =>
    roleSlug === "PM"
      ? { role: PM_ROLE, rubricVersion: RUBRIC_VERSION, criteria: PM_CRITERIA }
      : { role: SPM_ROLE, rubricVersion: RUBRIC_VERSION, criteria: SPM_CRITERIA }
  ),
  getRoleBySlug: vi.fn(async (roleSlug: "PM" | "SPM") => (roleSlug === "PM" ? PM_ROLE : SPM_ROLE)),
}));

vi.mock("@/lib/settings", () => ({
  getSetting: vi.fn(async (key: string) => (key === "SHORTLIST_THRESHOLD" ? 70 : 5)),
  getAllSettings: vi.fn(async () => ({ SHORTLIST_THRESHOLD: 70, TOP_CANDIDATES_FOR_BRIEF: 5 })),
}));

// Each mock factory below is hoisted above these `const` declarations by
// Vitest/ESM import ordering, so it must not touch the *Mock binding at
// factory-eval time (that binding is still in its temporal dead zone) —
// only inside a closure invoked later, once an actual test calls it.
const scoreCandidateMock = vi.fn((..._args: any[]): any => undefined);
vi.mock("@/lib/ai/score-candidate", () => ({
  scoreCandidate: (...args: any[]) => scoreCandidateMock(...args),
}));

const generateInterviewBriefMock = vi.fn(
  async (..._args: any[]) => "Sentence one. Sentence two. Sentence three."
);
vi.mock("@/lib/ai/interview-brief", () => ({
  generateInterviewBrief: (...args: any[]) => generateInterviewBriefMock(...args),
}));

const generateEmailDraftMock = vi.fn(async (..._args: any[]) => ({
  subject: "Hi {{candidate_name}}",
  body: "Body",
}));
vi.mock("@/lib/ai/email-draft", () => ({
  generateEmailDraft: (...args: any[]) => generateEmailDraftMock(...args),
}));

// --- Fake Prisma -----------------------------------------------------------

interface FakeCandidate {
  id: string;
  appliedRoleId: string;
  appliedRole: { slug: "PM" | "SPM" };
  sanitizedCvText: string;
  processingStatus: string;
  processingError: string | null;
}

const candidateStore = new Map<string, FakeCandidate>();
const candidateScores: Array<{ candidateId: string; roleId: string; rubricVersionId: string; totalScore: number; overallSummary: string; model: string }> = [];
const criterionScores: Array<Record<string, unknown>> = [];
const interviewBriefs: Array<{ candidateId: string; content: string }> = [];
const emailDrafts: Array<{ id: string; candidateId: string; emailType: string; subject: string; body: string; status: string; createdAt: Date }> = [];

vi.mock("@/lib/db", () => ({
  prisma: {
    candidate: {
      findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: string } }) => {
        const c = candidateStore.get(where.id);
        if (!c) throw new Error("not found");
        return c;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<FakeCandidate> }) => {
        const c = candidateStore.get(where.id)!;
        Object.assign(c, data);
      }),
    },
    candidateScore: {
      upsert: vi.fn(async ({ create }: { where: unknown; create: typeof candidateScores[number] }) => {
        const existingIndex = candidateScores.findIndex(
          (s) => s.candidateId === create.candidateId && s.roleId === create.roleId
        );
        const record = { ...create, id: `score-${create.candidateId}-${create.roleId}` };
        if (existingIndex >= 0) candidateScores[existingIndex] = record;
        else candidateScores.push(record);
        return record;
      }),
      count: vi.fn(async () => 0),
    },
    criterionScore: {
      deleteMany: vi.fn(async () => {}),
      createMany: vi.fn(async ({ data }: { data: Array<Record<string, unknown>> }) => {
        criterionScores.push(...data);
      }),
    },
    interviewBrief: {
      upsert: vi.fn(async ({ create }: { create: { candidateId: string; content: string } }) => {
        interviewBriefs.push(create);
      }),
    },
    emailDraft: {
      findUnique: vi.fn(
        async ({ where }: { where: { candidateId_emailType: { candidateId: string; emailType: string } } }) =>
          emailDrafts.find(
            (d) =>
              d.candidateId === where.candidateId_emailType.candidateId &&
              d.emailType === where.candidateId_emailType.emailType
          ) ?? null
      ),
      create: vi.fn(async ({ data }: { data: Omit<typeof emailDrafts[number], "id" | "createdAt"> }) => {
        const record = { ...data, id: `draft-${emailDrafts.length + 1}`, createdAt: new Date() };
        emailDrafts.push(record);
        return record;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<typeof emailDrafts[number]> }) => {
        const d = emailDrafts.find((x) => x.id === where.id)!;
        Object.assign(d, data);
      }),
    },
  },
}));

import { processCandidate } from "./process-candidate";

beforeEach(() => {
  candidateStore.clear();
  candidateScores.length = 0;
  criterionScores.length = 0;
  interviewBriefs.length = 0;
  emailDrafts.length = 0;
  scoreCandidateMock.mockReset();
  generateInterviewBriefMock.mockClear();
  generateEmailDraftMock.mockClear();
});

function scoreResponse(score: number, criterionId: string) {
  return {
    criteria: [
      {
        criterionId,
        criterionName: "Independent Ownership",
        score,
        reason: "reason",
        evidence: ["evidence"],
        evidenceStrength: "strong",
      },
    ],
    overallSummary: "summary",
    uncertainties: [],
  };
}

describe("processCandidate", () => {
  it("always scores both PM and SPM, regardless of applied role", async () => {
    candidateStore.set("cand-1", {
      id: "cand-1",
      appliedRoleId: PM_ROLE.id,
      appliedRole: { slug: "PM" },
      sanitizedCvText: "sanitized text",
      processingStatus: "redacting",
      processingError: null,
    });

    scoreCandidateMock.mockImplementation(async ({ roleName }: { roleName: string }) =>
      roleName === PM_ROLE.name ? scoreResponse(80, "pm-crit-1") : scoreResponse(50, "spm-crit-1")
    );

    await processCandidate("cand-1");

    expect(candidateScores).toHaveLength(2);
    const pmScore = candidateScores.find((s) => s.roleId === PM_ROLE.id)!;
    const spmScore = candidateScores.find((s) => s.roleId === SPM_ROLE.id)!;
    expect(pmScore.totalScore).toBe(80);
    expect(spmScore.totalScore).toBe(50);
  });

  it("uses the APPLIED role's score to drive the recommendation and default email action", async () => {
    candidateStore.set("cand-2", {
      id: "cand-2",
      appliedRoleId: PM_ROLE.id,
      appliedRole: { slug: "PM" },
      sanitizedCvText: "sanitized text",
      processingStatus: "redacting",
      processingError: null,
    });

    // PM score (applied role) is high; SPM score is low. Recommendation must follow PM, not SPM.
    scoreCandidateMock.mockImplementation(async ({ roleName }: { roleName: string }) =>
      roleName === PM_ROLE.name ? scoreResponse(90, "pm-crit-1") : scoreResponse(10, "spm-crit-1")
    );

    await processCandidate("cand-2");

    expect(candidateStore.get("cand-2")!.processingStatus).toBe("ready");
    expect(generateInterviewBriefMock).toHaveBeenCalledTimes(1); // qualifies: 90 >= 70 threshold
    // Both variants are always drafted, regardless of recommendation —
    // the founder can toggle between them on the candidate detail page.
    const candDrafts = emailDrafts.filter((d) => d.candidateId === "cand-2");
    expect(candDrafts.map((d) => d.emailType).sort()).toEqual(["interview_invite", "rejection"]);
  });

  it("drafts a rejection and skips the interview brief when the applied-role score is below threshold", async () => {
    candidateStore.set("cand-3", {
      id: "cand-3",
      appliedRoleId: SPM_ROLE.id,
      appliedRole: { slug: "SPM" },
      sanitizedCvText: "sanitized text",
      processingStatus: "redacting",
      processingError: null,
    });

    scoreCandidateMock.mockImplementation(async ({ roleName }: { roleName: string }) =>
      roleName === SPM_ROLE.name ? scoreResponse(40, "spm-crit-1") : scoreResponse(95, "pm-crit-1")
    );

    await processCandidate("cand-3");

    expect(generateInterviewBriefMock).not.toHaveBeenCalled();
    const candDrafts = emailDrafts.filter((d) => d.candidateId === "cand-3");
    expect(candDrafts.map((d) => d.emailType).sort()).toEqual(["interview_invite", "rejection"]);
  });

  it("marks the candidate as errored (not stuck 'processing') when scoring fails", async () => {
    candidateStore.set("cand-4", {
      id: "cand-4",
      appliedRoleId: PM_ROLE.id,
      appliedRole: { slug: "PM" },
      sanitizedCvText: "sanitized text",
      processingStatus: "redacting",
      processingError: null,
    });

    scoreCandidateMock.mockRejectedValue(new Error("Gemini timed out"));

    await expect(processCandidate("cand-4")).rejects.toThrow("Gemini timed out");
    expect(candidateStore.get("cand-4")!.processingStatus).toBe("error");
    expect(candidateStore.get("cand-4")!.processingError).toContain("Gemini timed out");
  });
});
