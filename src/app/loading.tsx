export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="overflow-hidden rounded-2xl px-6 py-7 sm:px-8 sm:py-8" style={{ background: "var(--gradient-hero)" }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-40 animate-pulse rounded-md bg-white/15" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded-md bg-white/10" />
          </div>
          <div className="h-9 w-32 animate-pulse rounded-lg bg-white/20" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/15 bg-white/10 px-4 py-3.5">
              <div className="h-7 w-10 animate-pulse rounded-md bg-white/20" />
              <div className="mt-2 h-3 w-20 animate-pulse rounded-md bg-white/15" />
            </div>
          ))}
        </div>
      </div>

      <div className="skeleton mt-6 h-[76px] rounded-xl" />

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-0">
            <div className="skeleton h-7 w-7 shrink-0 rounded-full" />
            <div className="skeleton h-4 w-36 rounded-md" />
            <div className="skeleton h-4 w-20 rounded-md" />
            <div className="skeleton ml-auto h-4 w-24 rounded-md" />
            <div className="skeleton h-6 w-28 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
