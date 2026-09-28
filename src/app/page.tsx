import Link from "next/link";
import { getDashboardData, type DashboardFilters } from "@/lib/queries/dashboard";
import { RecommendationBadge } from "@/components/recommendation-badge";
import { ScoreBar } from "@/components/score-bar";

// Always founder-specific, always fresh — never attempt static generation
// (which would otherwise run this against the database at build time).
export const dynamic = "force-dynamic";

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

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

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Candidates</h1>
        <Link
          href="/candidates/new"
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground"
        >
          Add Candidate
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile label="Total candidates" value={stats.total} />
        <StatTile label="PM candidates" value={stats.pmCount} />
        <StatTile label="SPM candidates" value={stats.spmCount} />
        <StatTile label="Shortlisted" value={stats.shortlisted} />
        <StatTile label="Pending review" value={stats.pendingReview} />
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Role</label>
          <select
            name="role"
            defaultValue={filters.role ?? ""}
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          >
            <option value="">All roles</option>
            <option value="PM">Product Manager</option>
            <option value="SPM">Senior Product Manager</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Status</label>
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Sort by</label>
          <select
            name="sort"
            defaultValue={filters.sort}
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          >
            <option value="score">Applied-role score</option>
            <option value="date">Date added</option>
          </select>
        </div>
        <div className="flex flex-1 min-w-[180px] flex-col gap-1">
          <label className="text-xs text-muted">Search candidate</label>
          <input
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="Name…"
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-border bg-neutral-bg px-3 py-1.5 text-sm font-medium"
        >
          Apply
        </button>
      </form>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted">
            No candidates yet. <Link href="/candidates/new" className="text-accent underline">Add your first candidate</Link>.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2 font-medium">Rank</th>
                <th className="px-4 py-2 font-medium">Candidate</th>
                <th className="px-4 py-2 font-medium">Applied Role</th>
                <th className="px-4 py-2 font-medium">Applied-Role Score</th>
                <th className="px-4 py-2 font-medium">PM Score</th>
                <th className="px-4 py-2 font-medium">SPM Score</th>
                <th className="px-4 py-2 font-medium">Recommendation</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Date Added</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-neutral-bg/50">
                  <td className="px-4 py-3 tabular-nums text-muted">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{row.candidateName}</td>
                  <td className="px-4 py-3 text-muted">{row.appliedRoleName}</td>
                  <td className="px-4 py-3">
                    <ScoreBar score={row.appliedRoleScore} />
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBar score={row.pmScore} />
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBar score={row.spmScore} />
                  </td>
                  <td className="px-4 py-3">
                    <RecommendationBadge recommendation={row.recommendation} />
                  </td>
                  <td className="px-4 py-3 text-muted">{statusLabel(row.processingStatus)}</td>
                  <td className="px-4 py-3 text-muted">
                    {row.createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/candidates/${row.id}`} className="text-accent hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
