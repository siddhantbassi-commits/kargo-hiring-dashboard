import type { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/db";
import { requireGeminiApiKey } from "@/lib/ai/config";
import { getResendClient, getFromAddress, EmailConfigError } from "@/lib/email/resend-client";

/**
 * Daily outage check for the two external dependencies that have actually
 * gone down this engagement (Gemini, Supabase) with nothing watching for it
 * — both prior outages were only found by manually clicking around. Hit by
 * the Vercel Cron Job in vercel.json; proxy.ts's matcher excludes /api/*, so
 * this route is reached directly and authenticates its own caller via
 * CRON_SECRET rather than a session cookie (see Vercel's documented
 * Authorization: Bearer pattern for securing cron-triggered routes).
 */

interface CheckResult {
  ok: boolean;
  error?: string;
}

async function checkDatabase(): Promise<CheckResult> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown database error" };
  }
}

async function checkGemini(): Promise<CheckResult> {
  try {
    // models.list() is the cheapest real round-trip to Gemini: it exercises
    // auth + connectivity without spending any generation/thinking tokens.
    const ai = new GoogleGenAI({ apiKey: requireGeminiApiKey() });
    await ai.models.list({ config: { pageSize: 1 } });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown Gemini error" };
  }
}

async function notifyFounder(failures: { name: string; error?: string }[]): Promise<void> {
  const founderEmail = process.env.FOUNDER_EMAIL;
  if (!founderEmail) return;

  try {
    const client = getResendClient();
    const from = getFromAddress();
    const lines = failures.map((f) => `- ${f.name}: ${f.error ?? "unknown error"}`).join("\n");
    await client.emails.send({
      from,
      to: founderEmail,
      subject: "Kargo Hiring Dashboard: service outage detected",
      text:
        `The daily automated health check found the following service(s) unreachable:\n\n${lines}\n\n` +
        "This may be transient — check again shortly. If it persists, check the Supabase and " +
        "Google AI Studio status/dashboards directly.",
    });
  } catch (error) {
    // Resend itself being down/misconfigured leaves nothing more this route
    // can do to notify anyone — the 503 below still shows up in Vercel's own
    // cron execution log, which is the fallback signal in that case.
    if (!(error instanceof EmailConfigError)) throw error;
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [database, gemini] = await Promise.all([checkDatabase(), checkGemini()]);

  const failures: { name: string; error?: string }[] = [];
  if (!database.ok) failures.push({ name: "Supabase (database)", error: database.error });
  if (!gemini.ok) failures.push({ name: "Gemini", error: gemini.error });

  if (failures.length > 0) {
    await notifyFounder(failures);
    return Response.json({ ok: false, failures }, { status: 503 });
  }

  return Response.json({ ok: true });
}
