import { describe, expect, it, vi, beforeEach } from "vitest";

interface Row {
  ip: string;
  failedCount: number;
  windowStart: Date;
  lockedUntil: Date | null;
}

const store = new Map<string, Row>();

vi.mock("@/lib/db", () => ({
  prisma: {
    loginAttempt: {
      findUnique: vi.fn(async ({ where }: { where: { ip: string } }) => store.get(where.ip) ?? null),
      upsert: vi.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { ip: string };
          create: Partial<Omit<Row, "ip">>;
          update: Partial<Row>;
        }) => {
          const existing = store.get(where.ip);
          const next: Row = existing
            ? { ...existing, ...update }
            : { ip: where.ip, failedCount: 0, windowStart: new Date(), lockedUntil: null, ...create };
          store.set(where.ip, next);
          return next;
        }
      ),
    },
  },
}));

import { isLoginLocked, recordFailedLogin, recordSuccessfulLogin } from "./login-rate-limit";

const IP_A = "203.0.113.1";
const IP_B = "203.0.113.2";

beforeEach(() => {
  store.clear();
  vi.useRealTimers();
});

describe("login rate limiting", () => {
  it("is not locked with no prior attempts", async () => {
    expect(await isLoginLocked(IP_A)).toBe(false);
  });

  it("stays unlocked below the attempt threshold", async () => {
    for (let i = 0; i < 9; i++) await recordFailedLogin(IP_A);
    expect(await isLoginLocked(IP_A)).toBe(false);
  });

  it("locks out after the attempt threshold within the window", async () => {
    for (let i = 0; i < 10; i++) await recordFailedLogin(IP_A);
    expect(await isLoginLocked(IP_A)).toBe(true);
  });

  it("a successful login clears both the counter and any lockout", async () => {
    for (let i = 0; i < 10; i++) await recordFailedLogin(IP_A);
    expect(await isLoginLocked(IP_A)).toBe(true);

    await recordSuccessfulLogin(IP_A);
    expect(await isLoginLocked(IP_A)).toBe(false);

    // Counter reset too, not just the lockout — nine more failures shouldn't relock.
    for (let i = 0; i < 9; i++) await recordFailedLogin(IP_A);
    expect(await isLoginLocked(IP_A)).toBe(false);
  });

  it("does not carry a failure count across an expired window", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(0);
      for (let i = 0; i < 9; i++) await recordFailedLogin(IP_A);

      vi.setSystemTime(16 * 60 * 1000); // past the 15-minute window
      await recordFailedLogin(IP_A);

      expect(await isLoginLocked(IP_A)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("locking out one IP does not lock out another", async () => {
    for (let i = 0; i < 10; i++) await recordFailedLogin(IP_A);
    expect(await isLoginLocked(IP_A)).toBe(true);
    expect(await isLoginLocked(IP_B)).toBe(false);
  });
});
