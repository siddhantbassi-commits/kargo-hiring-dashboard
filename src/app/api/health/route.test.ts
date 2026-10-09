import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const queryRawMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: { $queryRaw: (...args: unknown[]) => queryRawMock(...args) },
}));

const listModelsMock = vi.fn();
vi.mock("@google/genai", () => ({
  // A regular function (not an arrow function) so `new GoogleGenAI(...)` in
  // the route works — arrow functions aren't constructible.
  GoogleGenAI: vi.fn().mockImplementation(function GoogleGenAI() {
    return { models: { list: listModelsMock } };
  }),
}));

vi.mock("@/lib/ai/config", () => ({
  geminiClientOptions: vi.fn(() => ({ apiKey: "test-gemini-key" })),
}));

const sendEmailMock = vi.fn();
const { MockEmailConfigError } = vi.hoisted(() => ({
  MockEmailConfigError: class MockEmailConfigError extends Error {},
}));
vi.mock("@/lib/email/resend-client", () => ({
  getResendClient: vi.fn(() => ({ emails: { send: sendEmailMock } })),
  getFromAddress: vi.fn(() => "alerts@kargo.test"),
  EmailConfigError: MockEmailConfigError,
}));

import { GET } from "./route";

const CRON_SECRET = "test-cron-secret";

function request(authorization?: string) {
  return new NextRequest("http://localhost/api/health", {
    headers: authorization ? { authorization } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = CRON_SECRET;
  process.env.FOUNDER_EMAIL = "founder@kargo.test";
  queryRawMock.mockResolvedValue([{ "?column?": 1 }]);
  listModelsMock.mockResolvedValue({ models: [] });
  sendEmailMock.mockResolvedValue({ data: { id: "email_1" }, error: null });
});

describe("GET /api/health", () => {
  it("rejects a request without the correct CRON_SECRET bearer token", async () => {
    const res = await GET(request("Bearer wrong-secret"));
    expect(res.status).toBe(401);
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it("rejects a request with no Authorization header", async () => {
    const res = await GET(request());
    expect(res.status).toBe(401);
  });

  it("rejects every request if CRON_SECRET isn't configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(request(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(401);
  });

  it("returns 200 and sends no email when both checks succeed", async () => {
    const res = await GET(request(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("returns 503 and notifies the founder when Gemini is unreachable", async () => {
    listModelsMock.mockRejectedValue(new Error("Gemini is down"));

    const res = await GET(request(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.failures).toEqual([{ name: "Gemini", error: "Gemini is down" }]);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const [sentEmail] = sendEmailMock.mock.calls[0];
    expect(sentEmail.to).toBe("founder@kargo.test");
    expect(sentEmail.text).toContain("Gemini");
  });

  it("returns 503 and notifies the founder when the database is unreachable", async () => {
    queryRawMock.mockRejectedValue(new Error("connection refused"));

    const res = await GET(request(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.failures).toEqual([{ name: "Supabase (database)", error: "connection refused" }]);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("still returns 503 (without throwing) if Resend is also unavailable", async () => {
    queryRawMock.mockRejectedValue(new Error("connection refused"));
    sendEmailMock.mockRejectedValue(new MockEmailConfigError("RESEND_API_KEY is not configured."));

    const res = await GET(request(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(503);
  });
});
