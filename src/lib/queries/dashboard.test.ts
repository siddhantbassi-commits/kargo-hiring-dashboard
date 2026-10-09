import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/settings", () => ({
  getSetting: vi.fn(async () => 70),
}));

function makeCandidate(i: number) {
  return {
    id: `cand-${i}`,
    appliedRole: { slug: "PM", name: "Product Manager" },
    privateDetails: { fullName: `Candidate ${i}` },
    scores: [{ role: { slug: "PM" }, totalScore: 100 - i }],
    emailDrafts: [],
    processingStatus: "ready",
    createdAt: new Date(2026, 0, i),
  };
}

const allCandidates = Array.from({ length: 63 }, (_, i) => makeCandidate(i));

vi.mock("@/lib/db", () => ({
  prisma: {
    candidate: {
      findMany: vi.fn(async () => allCandidates),
    },
  },
}));

import { getDashboardData, DASHBOARD_PAGE_SIZE } from "./dashboard";

describe("getDashboardData pagination", () => {
  it("defaults to page 1 and returns exactly one page of rows", async () => {
    const result = await getDashboardData({});
    expect(result.page).toBe(1);
    expect(result.rows).toHaveLength(DASHBOARD_PAGE_SIZE);
    expect(result.filteredCount).toBe(63);
    expect(result.pageCount).toBe(Math.ceil(63 / DASHBOARD_PAGE_SIZE));
  });

  it("returns the correct slice for a later page", async () => {
    const page1 = await getDashboardData({ page: 1 });
    const page2 = await getDashboardData({ page: 2 });
    expect(page2.rows[0].id).not.toBe(page1.rows[0].id);
    // No overlap between pages.
    const page1Ids = new Set(page1.rows.map((r) => r.id));
    expect(page2.rows.every((r) => !page1Ids.has(r.id))).toBe(true);
  });

  it("the last page holds the remainder, not a full page", async () => {
    const lastPage = Math.ceil(63 / DASHBOARD_PAGE_SIZE);
    const result = await getDashboardData({ page: lastPage });
    expect(result.rows.length).toBe(63 % DASHBOARD_PAGE_SIZE || DASHBOARD_PAGE_SIZE);
  });

  it("clamps an out-of-range page request to the last valid page", async () => {
    const result = await getDashboardData({ page: 999 });
    expect(result.page).toBe(Math.ceil(63 / DASHBOARD_PAGE_SIZE));
  });

  it("clamps a page below 1 up to page 1", async () => {
    const result = await getDashboardData({ page: 0 });
    expect(result.page).toBe(1);
  });

  it("stats reflect the full filtered set, not just the current page", async () => {
    const result = await getDashboardData({ page: 2 });
    expect(result.stats.total).toBe(63);
  });
});
