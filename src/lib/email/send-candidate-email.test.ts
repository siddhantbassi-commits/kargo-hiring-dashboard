import { describe, expect, it, vi, beforeEach } from "vitest";

const sendMock = vi.fn();

vi.mock("@/lib/email/resend-client", () => ({
  getResendClient: () => ({ emails: { send: sendMock } }),
  getFromAddress: () => "kargo@example.com",
  EmailConfigError: class EmailConfigError extends Error {},
}));

interface FakeDraft {
  id: string;
  status: string;
  subject: string;
  body: string;
  editedSubject: string | null;
  editedBody: string | null;
}

const draft: FakeDraft = {
  id: "draft-1",
  status: "draft",
  subject: "Hi {{candidate_name}}",
  body: "Body {{candidate_name}}",
  editedSubject: null,
  editedBody: null,
};

const emailSends: Array<Record<string, unknown>> = [];

vi.mock("@/lib/db", () => ({
  prisma: {
    candidate: {
      findUnique: vi.fn(async () => ({
        id: "cand-1",
        privateDetails: { email: "candidate@example.com", firstName: "Priya" },
        emailDrafts: [draft],
      })),
    },
    emailDraft: {
      updateMany: vi.fn(async ({ where, data }: { where: { status: string }; data: { status: string } }) => {
        if (draft.status !== where.status) return { count: 0 };
        draft.status = data.status;
        return { count: 1 };
      }),
      update: vi.fn(async ({ data }: { data: { status: string } }) => {
        draft.status = data.status;
      }),
    },
    emailSend: {
      create: vi.fn(async () => {
        const record = { id: `send-${emailSends.length + 1}`, status: "pending" };
        emailSends.push(record);
        return record;
      }),
      update: vi.fn(async () => {}),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

import { sendCandidateEmail } from "./send-candidate-email";

beforeEach(() => {
  draft.status = "draft";
  sendMock.mockReset();
  emailSends.length = 0;
});

describe("sendCandidateEmail", () => {
  it("sends successfully and marks the draft as sent", async () => {
    sendMock.mockResolvedValue({ data: { id: "resend-123" }, error: null });
    const result = await sendCandidateEmail("cand-1");
    expect(result.ok).toBe(true);
    expect(draft.status).toBe("sent");
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("refuses to send twice — the second call finds the draft already claimed", async () => {
    sendMock.mockResolvedValue({ data: { id: "resend-123" }, error: null });
    const [first, second] = await Promise.all([
      sendCandidateEmail("cand-1"),
      sendCandidateEmail("cand-1"),
    ]);
    const outcomes = [first, second];
    expect(outcomes.filter((o) => o.ok)).toHaveLength(1);
    expect(outcomes.filter((o) => !o.ok)).toHaveLength(1);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("rolls back to draft status on a Resend failure so it can be retried", async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: "Resend rejected the request" } });
    const result = await sendCandidateEmail("cand-1");
    expect(result.ok).toBe(false);
    expect(draft.status).toBe("draft");
  });

  it("personalizes the placeholder with the real name only at send time", async () => {
    sendMock.mockResolvedValue({ data: { id: "resend-1" }, error: null });
    await sendCandidateEmail("cand-1");
    const callArgs = sendMock.mock.calls[0][0];
    expect(callArgs.subject).toBe("Hi Priya");
    expect(callArgs.text).toBe("Body Priya");
  });
});
