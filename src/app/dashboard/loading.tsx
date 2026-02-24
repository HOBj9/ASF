import { Loading } from "@/components/ui/loading"

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4 text-right">
      <Loading size="md" text="جاري التحميل" />
    </div>
  )
}
