import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-1 text-right">
      <div className="rounded-2xl border bg-card p-6">
        <Skeleton className="h-4 w-40 mb-3" />
        <Skeleton className="h-8 w-72 mb-2" />
        <Skeleton className="h-4 w-60" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={`dashboard-loading-kpi-${idx}`} className="rounded-xl border bg-card p-4">
            <Skeleton className="h-4 w-28 mb-3" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border bg-card p-4">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-[420px] w-full rounded-xl" />
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={`dashboard-loading-event-${idx}`} className="rounded-lg border p-3">
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
