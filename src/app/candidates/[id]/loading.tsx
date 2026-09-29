export default function CandidateDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="skeleton h-4 w-32 rounded-md" />

      <div className="mt-5 flex items-start justify-between gap-6 rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-start gap-4">
          <div className="skeleton h-[52px] w-[52px] shrink-0 rounded-full" />
          <div>
            <div className="skeleton h-6 w-48 rounded-md" />
            <div className="skeleton mt-2 h-4 w-64 rounded-md" />
            <div className="skeleton mt-3 h-5 w-36 rounded-full" />
          </div>
        </div>
        <div className="skeleton h-[84px] w-[84px] shrink-0 rounded-full" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface p-6">
            <div className="skeleton h-4 w-32 rounded-md" />
            <div className="skeleton mt-3 h-3 w-full rounded-md" />
            <div className="mt-5 space-y-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j}>
                  <div className="skeleton h-3.5 w-40 rounded-md" />
                  <div className="skeleton mt-2 h-3 w-full rounded-md" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="skeleton mt-6 h-24 rounded-2xl" />
      <div className="skeleton mt-6 h-64 rounded-2xl" />
    </div>
  );
}
