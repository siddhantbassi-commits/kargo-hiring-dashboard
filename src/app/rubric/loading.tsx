export default function RubricLoading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="skeleton h-7 w-24 rounded-md" />
      <div className="skeleton mt-2 h-4 w-full max-w-2xl rounded-md" />
      <div className="skeleton mt-1 h-4 w-2/3 max-w-2xl rounded-md" />

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, col) => (
          <div key={col} className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <div className="skeleton h-4 w-36 rounded-md" />
              <div className="skeleton h-6 w-14 rounded-full" />
            </div>
            <div className="mt-4 flex flex-col divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                  <div className="flex-1">
                    <div className="skeleton h-4 w-40 rounded-md" />
                    <div className="skeleton mt-2 h-3 w-56 rounded-md" />
                  </div>
                  <div className="skeleton h-8 w-16 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
