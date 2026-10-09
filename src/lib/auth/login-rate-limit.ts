import { prisma } from "@/lib/db";

/**
 * Per-IP login attempt throttling (login_attempts table — one row per source
 * IP). An earlier version tracked a single global counter in app_settings,
 * which meant one attacker's failed attempts could lock out the real founder
 * too; this keys the counter on the request's IP instead so that only the
 * attacker's own IP gets locked out.
 *
 * Deliberately returns the same generic "invalid credentials" failure
 * whether the IP is locked or the password was simply wrong — telling an
 * attacker they've triggered a lockout (and its exact timing) is itself
 * information leakage.
 */
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function isLoginLocked(ip: string): Promise<boolean> {
  const row = await prisma.loginAttempt.findUnique({ where: { ip } });
  return !!row?.lockedUntil && Date.now() < row.lockedUntil.getTime();
}

export async function recordFailedLogin(ip: string): Promise<void> {
  const now = Date.now();
  const row = await prisma.loginAttempt.findUnique({ where: { ip } });
  const windowExpired = !row || now - row.windowStart.getTime() > WINDOW_MS;

  const count = (windowExpired ? 0 : row.failedCount) + 1;
  const lockedUntil = count >= MAX_ATTEMPTS ? new Date(now + LOCKOUT_MS) : (windowExpired ? null : row?.lockedUntil ?? null);

  await prisma.loginAttempt.upsert({
    where: { ip },
    create: {
      ip,
      failedCount: count,
      windowStart: new Date(now),
      lockedUntil,
    },
    update: {
      failedCount: count,
      ...(windowExpired ? { windowStart: new Date(now) } : {}),
      lockedUntil,
    },
  });
}

export async function recordSuccessfulLogin(ip: string): Promise<void> {
  await prisma.loginAttempt.upsert({
    where: { ip },
    create: { ip, failedCount: 0, lockedUntil: null },
    update: { failedCount: 0, lockedUntil: null },
  });
}
