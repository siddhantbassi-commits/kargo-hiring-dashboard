import Link from "next/link";
import { getDashboardData, DASHBOARD_PAGE_SIZE, type DashboardFilters } from "@/lib/queries/dashboard";
import { RecommendationBadge } from "@/components/recommendation-badge";
import { ScoreBar } from "@/components/score-bar";
import { Avatar } from "@/components/avatar";
import { StatTile } from "@/components/stat-tile";
import { IconUsers, IconBriefcase, IconStar, IconClock, IconSearch, IconArrowRight } from "@/components/icons";

// Always founder-specific, always fresh — never attempt static generation
// (which would otherwise run this against the database at build time).
export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "shortlist_recommended", label: "Shortlist Recommended" },
  { value: "review_recommended", label: "Review Recommended" },
  { value: "below_threshold", label: "Below Threshold" },
] as const;

function statusLabel(status: string): string {
  switch (status) {
    case "uploaded":
    case "extracting":
    case "redacting":
      return "Processing";
    case "scoring":
      return "Scoring";
    case "generating":
      return "Generating";
    case "ready":
      return "Ready";
    case "error":
      return "Error";
    default:
      return status;
  }
}

const RANK_MEDAL: Array<{ bg: string; fg: string }> = [
  { bg: "var(--gold)", fg: "#fff" },
  { bg: "var(--silver)", fg: "#fff" },
  { bg: "var(--bronze)", fg: "#fff" },
];

const ROLE_CHIP: Record<string, { bg: string; fg: string; label: string }> = {
  "Product Manager": { bg: "var(--role-pm-bg)", fg: "var(--role-pm)", label: "PM" },
  "Senior Product Manager": { bg: "var(--role-spm-bg)", fg: "var(--role-spm)", label: "SPM" },
};

export default async function DashboardPage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const filters: DashboardFilters = {
    role: get("role") === "PM" || get("role") === "SPM" ? (get("role") as "PM" | "SPM") : undefined,
    status:
      get("status") === "shortlist_recommended" ||
      get("status") === "review_recommended" ||
      get("status") === "below_threshold"
        ? (get("status") as DashboardFilters["status"])
        : undefined,
    search: get("search") || undefined,
    sort: get("sort") === "date" ? "date" : "score",
    page: Number(get("page")) || 1,
  };

  const { rows, stats, page, pageCount, filteredCount } = await getDashboardData(filters);
  const hasFilters = Boolean(filters.role || filters.status || filters.search);

  // Preserves every other filter/sort param when linking to a different page.
  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (filters.role) params.set("role", filters.role);
    if (filters.status) params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);
    if (filters.sort !== "score") params.set("sort", filters.sort ?? "score");
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div
        className="overflow-hidden rounded-2xl px-6 py-7 shadow-[var(--shadow-glow)] sm:px-8 sm:py-8"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Candidates</h1>
            <p className="mt-1 text-sm text-white/70">
              Ranked by applied-role score. The system recommends — you decide.
            </p>
          </div>
          <Link
            href="/candidates/new"
            className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-[#1e2c52] shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-px active:translate-y-0"
          >
            Add Candidate
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatTile label="Total candidates" value={stats.total} icon={<IconUsers />} accent="info" tone="onGradient" />
          <StatTile label="PM candidates" value={stats.pmCount} icon={<IconBriefcase />} accent="role-pm" tone="onGradient" />
          <StatTile label="SPM candidates" value={stats.spmCount} icon={<IconBriefcase />} accent="role-spm" tone="onGradient" />
          <StatTile label="Shortlisted" value={stats.shortlisted} icon={<IconStar />} accent="success" tone="onGradient" />
          <StatTile label="Pending review" value={stats.pendingReview} icon={<IconClock />} accent="warning" tone="onGradient" />
        </div>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-role" className="text-xs font-medium text-muted">Role</label>
          <select
            id="filter-role"
            name="role"
            defaultValue={filters.role ?? ""}
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-accent-2"
          >
            <option value="">All roles</option>
            <option value="PM">Product Manager</option>
            <option value="SPM">Senior Product Manager</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-status" className="text-xs font-medium text-muted">Status</label>
          <select
            id="filter-status"
            name="status"
            defaultValue={filters.status ?? ""}
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-accent-2"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-sort" className="text-xs font-medium text-muted">Sort by</label>
          <select
            id="filter-sort"
            name="sort"
            defaultValue={filters.sort}
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-accent-2"
          >
            <option value="score">Applied-role score</option>
            <option value="date">Date added</option>
          </select>
        </div>
        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <label htmlFor="filter-search" className="text-xs font-medium text-muted">Search candidate</label>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-2" />
            <input
              id="filter-search"
              name="search"
              defaultValue={filters.search ?? ""}
              placeholder="Name…"
              className="w-full rounded-md border border-border bg-surface py-1.5 pl-8 pr-2.5 text-sm outline-none transition-colors focus:border-accent-2"
            />
          </div>
        </div>
        <button
          type="submit"
          className="rounded-md bg-foreground px-4 py-1.5 text-sm font-medium text-surface transition-opacity hover:opacity-90"
        >
          Apply
        </button>
        {hasFilters ? (
          <Link href="/" className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline">
            Clear
          </Link>
        ) : null}
      </form>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-sm)]">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-14 text-center">
            <div className="rounded-full bg-neutral-bg p-3 text-muted-2">
              <IconUsers />
            </div>
            <p className="text-sm text-muted">
              {hasFilters ? "No candidates match these filters." : "No candidates yet."}
            </p>
            {!hasFilters && (
              <Link href="/candidates/new" className="text-sm font-medium text-accent-2 hover:underline">
                Add your first candidate →
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-hover text-left text-[11px] font-semibold uppercase tracking-wider text-muted">
                  <th scope="col" className="w-12 px-4 py-2.5">Rank</th>
                  <th scope="col" className="px-3 py-2.5">Candidate</th>
                  <th scope="col" className="px-3 py-2.5">Applied Role</th>
                  <th scope="col" className="px-3 py-2.5">Applied-Role Score</th>
                  <th scope="col" className="px-3 py-2.5">PM Score</th>
                  <th scope="col" className="px-3 py-2.5">SPM Score</th>
                  <th scope="col" className="px-3 py-2.5">Recommendation</th>
                  <th scope="col" className="px-3 py-2.5">Status</th>
                  <th scope="col" className="px-3 py-2.5">Date Added</th>
                  <th scope="col" className="px-4 py-2.5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const rank = (page - 1) * DASHBOARD_PAGE_SIZE + i + 1;
                  const medal = RANK_MEDAL[rank - 1];
                  const roleChip = ROLE_CHIP[row.appliedRoleName];
                  return (
                  <tr key={row.id} className="group border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-4 py-3">
                      {medal ? (
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold tabular-nums shadow-[var(--shadow-sm)]"
                          style={{ backgroundColor: medal.bg, color: medal.fg }}
                        >
                          {rank}
                        </span>
                      ) : (
                        <span className="pl-1.5 tabular-nums font-semibold text-muted-2">{rank}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/candidates/${row.id}`} className="flex items-center gap-2.5">
                        <Avatar name={row.candidateName} size={28} />
                        <span className="font-medium text-foreground group-hover:text-accent-2">
                          {row.candidateName}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      {roleChip ? (
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                          style={{ backgroundColor: roleChip.bg, color: roleChip.fg }}
                        >
                          {roleChip.label}
                        </span>
                      ) : (
                        <span className="text-muted">{row.appliedRoleName}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <ScoreBar score={row.appliedRoleScore} />
                    </td>
                    <td className="px-3 py-3">
                      <ScoreBar score={row.pmScore} />
                    </td>
                    <td className="px-3 py-3">
                      <ScoreBar score={row.spmScore} />
                    </td>
                    <td className="px-3 py-3">
                      <RecommendationBadge recommendation={row.recommendation} />
                    </td>
                    <td className="px-3 py-3 text-muted">{statusLabel(row.processingStatus)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-muted">
                      {row.createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/candidates/${row.id}`}
                        className="inline-flex items-center gap-1 text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-accent-2"
                      >
                        View <IconArrowRight />
                      </Link>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rows.length > 0 && pageCount > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <span>
            Page {page} of {pageCount} · {filteredCount} candidate{filteredCount === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className="rounded-md border border-border bg-surface px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                ← Previous
              </Link>
            ) : (
              <span className="rounded-md border border-border px-3 py-1.5 text-muted-2 opacity-50">
                ← Previous
              </span>
            )}
            {page < pageCount ? (
              <Link
                href={pageHref(page + 1)}
                className="rounded-md border border-border bg-surface px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                Next →
              </Link>
            ) : (
              <span className="rounded-md border border-border px-3 py-1.5 text-muted-2 opacity-50">
                Next →
              </span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
