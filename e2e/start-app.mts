import { createServer } from "node:http";
import { spawn, execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { APP_PORT, READINESS_PORT } from "./ports";
import { FOUNDER_EMAIL, FOUNDER_PASSWORD } from "./credentials";

/**
 * Migrates + seeds the DB, starts `next dev`, then fetches every route the
 * E2E suite visits once each BEFORE signaling ready — on a SEPARATE
 * readiness port (see playwright.config.ts's webServer entry) so that
 * check can't pass early just because next dev's own port already accepts
 * connections while a route is still mid-compile.
 *
 * Why: Turbopack dev compiles a route's client bundle lazily, on its first
 * request. Without this, only /login would be warm by the time tests start;
 * every OTHER route (including the dynamic candidate detail page) would
 * then get first-compiled mid-test, and a fill()/click() landing during
 * that window is silently lost (React hasn't attached yet). Warming every
 * route here moves that cost into (visible, timed) startup instead.
 */
const BASE_URL = `http://127.0.0.1:${APP_PORT}`;
const WARM_UP_PATHS = ["/login", "/", "/candidates/new", "/rubric"];

function run(command: string) {
  console.log(`[start-app] $ ${command}`);
  execSync(command, { stdio: "inherit" });
}

async function waitForServerUp() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await fetch(BASE_URL);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`Server on ${BASE_URL} never came up.`);
}

function cookieHeaderFrom(response: Response): string {
  // Node's fetch doesn't maintain a cookie jar across calls — every warm-up
  // request is otherwise anonymous, which is the whole reason this needed
  // fixing: an anonymous request to a protected route 307s to /login before
  // that route's own page module (and its client components) ever loads.
  return response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

/** Programmatic Auth.js credentials sign-in (the documented script-friendly flow: GET csrf, POST callback with it), so warm-up can request protected pages as the founder instead of anonymously. */
async function signInAndGetSessionCookie(): Promise<string> {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  const csrfCookie = cookieHeaderFrom(csrfRes);

  const body = new URLSearchParams({
    csrfToken,
    email: FOUNDER_EMAIL,
    password: FOUNDER_PASSWORD,
    redirect: "false",
  });
  const signInRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: csrfCookie },
    body,
    redirect: "manual",
  });
  const sessionCookie = cookieHeaderFrom(signInRes);
  if (!sessionCookie) {
    throw new Error(`Sign-in during warm-up failed (status ${signInRes.status}) — check FOUNDER_EMAIL/FOUNDER_PASSWORD_HASH.`);
  }
  return [csrfCookie, sessionCookie].filter(Boolean).join("; ");
}

async function fetchAndTime(path: string, cookie: string) {
  const start = Date.now();
  const res = await fetch(`${BASE_URL}${path}`, { headers: { cookie } });
  await res.arrayBuffer(); // drain the body — some servers don't finish the response until read
  console.log(`[start-app] warmed ${path} -> ${res.status} in ${Date.now() - start}ms`);
}

/**
 * The dynamic /candidates/[id] page's client components (DeleteCandidateButton,
 * EmailDraftEditor) only get bundled once actually RENDERED — a nonexistent
 * id hits `notFound()` before React ever reaches them, so visiting one
 * doesn't compile anything useful. A real, fully-rendered candidate (ready
 * status + at least one email draft, so EmailDraftEditor mounts) is the only
 * way to warm that page's real client bundle. Created and torn down here, so
 * the suite's own tests still see an empty dashboard.
 */
async function withWarmUpCandidate<T>(prisma: PrismaClient, fn: (candidateId: string) => Promise<T>): Promise<T> {
  const role = await prisma.role.findFirstOrThrow({ where: { slug: "PM" } });
  const candidate = await prisma.candidate.create({
    data: {
      appliedRoleId: role.id,
      originalFilename: "warm-up.txt",
      originalMimeType: "text/plain",
      sanitizedCvText: "Warm-up candidate used only to pre-compile this page's client bundle.",
      processingStatus: "ready",
      privateDetails: { create: { fullName: "Warm Up", firstName: "Warm" } },
      emailDrafts: { create: { emailType: "rejection", subject: "Warm-up", body: "Warm-up" } },
    },
  });
  try {
    return await fn(candidate.id);
  } finally {
    await prisma.candidate.delete({ where: { id: candidate.id } });
  }
}

async function warmUp() {
  const cookie = await signInAndGetSessionCookie();
  for (const path of WARM_UP_PATHS) {
    await fetchAndTime(path, cookie);
  }

  const prisma = new PrismaClient();
  try {
    await withWarmUpCandidate(prisma, (candidateId) => fetchAndTime(`/candidates/${candidateId}`, cookie));
  } finally {
    await prisma.$disconnect();
  }
}

run("npx prisma migrate deploy");
run("npx tsx prisma/seed.ts");

console.log("[start-app] starting next dev...");
const next = spawn("npx", ["next", "dev", "-p", String(APP_PORT)], { stdio: "inherit" });
next.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => next.kill(signal));
}

await waitForServerUp();
await warmUp();
console.log("[start-app] warm-up complete — opening the readiness port for Playwright.");

// Only NOW does Playwright's webServer health check (pointed at this port,
// not APP_PORT) have anything to succeed against.
createServer((_req, res) => res.writeHead(200).end("ready")).listen(READINESS_PORT);
