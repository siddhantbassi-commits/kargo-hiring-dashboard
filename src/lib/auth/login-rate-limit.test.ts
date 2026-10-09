import { describe, expect, it, vi, beforeEach } from "vitest";

const store = new Map<string, string>();

vi.mock("@/lib/db", () => ({
  prisma: {
    appSetting: {
      findUnique: vi.fn(async ({ where }: { where: { key: string } }) => {
        const value = store.get(where.key);
        return value === undefined ? null : { key: where.key, value };
      }),
      upsert: vi.fn(async ({ where, create }: { where: { key: string }; create: { value: string } }) => {
        store.set(where.key, create.value);
      }),
    },
  },
}));

import { isLoginLocked, recordFailedLogin, recordSuccessfulLogin } from "./login-rate-limit";

beforeEach(() => {
  store.clear();
  vi.useRealTimers();
});

describe("login rate limiting", () => {
  it("is not locked with no prior attempts", async () => {
    expect(await isLoginLocked()).toBe(false);
  });

  it("stays unlocked below the attempt threshold", async () => {
    for (let i = 0; i < 9; i++) await recordFailedLogin();
    expect(await isLoginLocked()).toBe(false);
  });

  it("locks out after the attempt threshold within the window", async () => {
    for (let i = 0; i < 10; i++) await recordFailedLogin();
    expect(await isLoginLocked()).toBe(true);
  });

  it("a successful login clears both the counter and any lockout", async () => {
    for (let i = 0; i < 10; i++) await recordFailedLogin();
    expect(await isLoginLocked()).toBe(true);

    await recordSuccessfulLogin();
    expect(await isLoginLocked()).toBe(false);

    // Counter reset too, not just the lockout — nine more failures shouldn't relock.
    for (let i = 0; i < 9; i++) await recordFailedLogin();
    expect(await isLoginLocked()).toBe(false);
  });

  it("does not carry a failure count across an expired window", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(0);
      for (let i = 0; i < 9; i++) await recordFailedLogin();

      vi.setSystemTime(16 * 60 * 1000); // past the 15-minute window
      await recordFailedLogin();

      expect(await isLoginLocked()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
