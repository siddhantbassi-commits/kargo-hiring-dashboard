import { prisma } from "@/lib/db";
import type { RoleSlug } from "@prisma/client";
import { getRecommendation, type Recommendation } from "@/lib/scoring/recommendation";
import { getSetting } from "@/lib/settings";

export interface DashboardRow {
  id: string;
  candidateName: string;
  appliedRoleSlug: RoleSlug;
  appliedRoleName: string;
  appliedRoleScore: number | null;
  pmScore: number | null;
  spmScore: number | null;
  recommendation: Recommendation | null;
  processingStatus: string;
  emailStatus: string | null;
  createdAt: Date;
}

export interface DashboardStats {
  total: number;
  pmCount: number;
  spmCount: number;
  shortlisted: number;
  pendingReview: number;
}

export interface DashboardFilters {
  role?: RoleSlug;
  status?: "shortlist_recommended" | "review_recommended" | "below_threshold";
  search?: string;
  sort?: "score" | "date";
  page?: number;
}

export const DASHBOARD_PAGE_SIZE = 25;

export async function getDashboardData(filters: DashboardFilters): Promise<{
  rows: DashboardRow[];
  stats: DashboardStats;
  threshold: number;
  page: number;
  pageCount: number;
  filteredCount: number;
}> {
  // Two independent round trips to a Postgres instance on another continent
  // from the app's serverless functions — running them concurrently instead
  // of sequentially halves that latency cost.
  const [threshold, candidates] = await Promise.all([
    getSetting("SHORTLIST_THRESHOLD"),
    prisma.candidate.findMany({
      include: {
        appliedRole: true,
        privateDetails: true,
        scores: { include: { role: true } },
        emailDrafts: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  let rows: DashboardRow[] = candidates.map((c) => {
    const pmScore = c.scores.find((s) => s.role.slug === "PM")?.totalScore ?? null;
    const spmScore = c.scores.find((s) => s.role.slug === "SPM")?.totalScore ?? null;
    const appliedRoleScore = c.appliedRole.slug === "PM" ? pmScore : spmScore;
    const recommendation =
      appliedRoleScore !== null ? getRecommendation(appliedRoleScore, threshold) : null;

    return {
      id: c.id,
      candidateName: c.privateDetails?.fullName ?? "Unknown",
      appliedRoleSlug: c.appliedRole.slug,
      appliedRoleName: c.appliedRole.name,
      appliedRoleScore,
      pmScore,
      spmScore,
      recommendation,
      processingStatus: c.processingStatus,
      emailStatus: c.emailDrafts[0]?.status ?? null,
      createdAt: c.createdAt,
    };
  });

  const stats: DashboardStats = {
    total: rows.length,
    pmCount: rows.filter((r) => r.appliedRoleSlug === "PM").length,
    spmCount: rows.filter((r) => r.appliedRoleSlug === "SPM").length,
    shortlisted: rows.filter((r) => r.recommendation === "shortlist_recommended").length,
    pendingReview: rows.filter((r) => r.processingStatus !== "ready").length,
  };

  if (filters.role) rows = rows.filter((r) => r.appliedRoleSlug === filters.role);
  if (filters.status) rows = rows.filter((r) => r.recommendation === filters.status);
  if (filters.search) {
    const q = filters.search.trim().toLowerCase();
    rows = rows.filter((r) => r.candidateName.toLowerCase().includes(q));
  }

  if (filters.sort === "date") {
    rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } else {
    // Default: highest applied-role score first (nulls — still processing — sort last).
    rows.sort((a, b) => (b.appliedRoleScore ?? -1) - (a.appliedRoleScore ?? -1));
  }

  // Pagination happens here, in-memory, after filtering/sorting — not as a
  // Prisma skip/take — because recommendation/appliedRoleScore are computed
  // fields, not raw columns a SQL WHERE/ORDER BY can see. Fine at the scale
  // a single founder's candidate list actually reaches; the full-table fetch
  // above would be the next bottleneck if this ever grew into the thousands.
  const filteredCount = rows.length;
  const pageCount = Math.max(1, Math.ceil(filteredCount / DASHBOARD_PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page ?? 1), pageCount);
  const start = (page - 1) * DASHBOARD_PAGE_SIZE;
  const pagedRows = rows.slice(start, start + DASHBOARD_PAGE_SIZE);

  return { rows: pagedRows, stats, threshold, page, pageCount, filteredCount };
}
