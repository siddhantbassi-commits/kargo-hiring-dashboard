import Link from "next/link";
import { getDashboardData, type DashboardFilters } from "@/lib/queries/dashboard";
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

const RANK_STYLE = ["text-[#9a7b1f]", "text-[#6b7280]", "text-[#8a5a3a]"];

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
  };

  const { rows, stats } = await getDashboardData(filters);
  const hasFilters = Boolean(filters.role || filters.status || filters.search);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Candidates</h1>
          <p className="mt-0.5 text-sm text-muted">
            Ranked by applied-role score. The system recommends — you decide.
          </p>
        </div>
        <Link
          href="/candidates/new"
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-foreground shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-px active:translate-y-0"
        >
          Add Candidate
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile label="Total candidates" value={stats.total} icon={<IconUsers />} />
        <StatTile label="PM candidates" value={stats.pmCount} icon={<IconBriefcase />} />
        <StatTile label="SPM candidates" value={stats.spmCount} icon={<IconBriefcase />} />
        <StatTile label="Shortlisted" value={stats.shortlisted} icon={<IconStar />} accent="success" />
        <StatTile label="Pending review" value={stats.pendingReview} icon={<IconClock />} accent="warning" />
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted">Role</label>
          <select
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
          <label className="text-xs font-medium text-muted">Status</label>
          <select
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
          <label className="text-xs font-medium text-muted">Sort by</label>
          <select
            name="sort"
            defaultValue={filters.sort}
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-accent-2"
          >
            <option value="score">Applied-role score</option>
            <option value="date">Date added</option>
          </select>
        </div>
        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <label className="text-xs font-medium text-muted">Search candidate</label>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-2" />
            <input
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
                  <th className="w-12 px-4 py-2.5">Rank</th>
                  <th className="px-3 py-2.5">Candidate</th>
                  <th className="px-3 py-2.5">Applied Role</th>
                  <th className="px-3 py-2.5">Applied-Role Score</th>
                  <th className="px-3 py-2.5">PM Score</th>
                  <th className="px-3 py-2.5">SPM Score</th>
                  <th className="px-3 py-2.5">Recommendation</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Date Added</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id} className="group border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className={`px-4 py-3 tabular-nums font-semibold ${i < 3 ? RANK_STYLE[i] : "text-muted-2"}`}>
                      {i + 1}
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/candidates/${row.id}`} className="flex items-center gap-2.5">
                        <Avatar name={row.candidateName} size={28} />
                        <span className="font-medium text-foreground group-hover:text-accent-2">
                          {row.candidateName}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-muted">{row.appliedRoleName}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
