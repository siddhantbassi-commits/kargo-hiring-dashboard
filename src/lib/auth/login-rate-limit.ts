import { prisma } from "@/lib/db";

/**
 * Login attempt throttling for the single founder account. There's no
 * per-IP store (no Redis/KV provisioned), and there's only ever one valid
 * account anyway, so this tracks a single global counter in app_settings
 * (an existing key/value table — no migration needed) rather than per-IP.
 *
 * Deliberately returns the same generic "invalid credentials" failure
 * whether the account is locked or the password was simply wrong — telling
 * an attacker they've triggered a lockout (and its exact timing) is itself
 * information leakage for a single-account system.
 */
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

const FAILED_COUNT_KEY = "LOGIN_FAILED_COUNT";
const FAILED_SINCE_KEY = "LOGIN_FAILED_SINCE";
const LOCKED_UNTIL_KEY = "LOGIN_LOCKED_UNTIL";

async function getValue(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

async function setValue(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function isLoginLocked(): Promise<boolean> {
  const raw = await getValue(LOCKED_UNTIL_KEY);
  const lockedUntil = raw ? Number(raw) : 0;
  return Number.isFinite(lockedUntil) && Date.now() < lockedUntil;
}

export async function recordFailedLogin(): Promise<void> {
  const now = Date.now();
  const sinceRaw = await getValue(FAILED_SINCE_KEY);
  const since = sinceRaw ? Number(sinceRaw) : 0;
  const windowExpired = !Number.isFinite(since) || now - since > WINDOW_MS;

  const count = (windowExpired ? 0 : Number((await getValue(FAILED_COUNT_KEY)) ?? "0") || 0) + 1;

  if (windowExpired) {
    await setValue(FAILED_SINCE_KEY, String(now));
  }
  await setValue(FAILED_COUNT_KEY, String(count));

  if (count >= MAX_ATTEMPTS) {
    await setValue(LOCKED_UNTIL_KEY, String(now + LOCKOUT_MS));
  }
}

export async function recordSuccessfulLogin(): Promise<void> {
  await setValue(FAILED_COUNT_KEY, "0");
  await setValue(LOCKED_UNTIL_KEY, "0");
}
