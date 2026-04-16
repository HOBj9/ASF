import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { Radio } from "lucide-react"
import { TrackingMonitor } from "@/components/dashboard/tracking-monitor"
import { Button } from "@/components/ui/button"
import { authOptions } from "@/lib/auth"
import { permissionActions, permissionResources } from "@/constants/permissions"
import { hasPermission, isAdmin } from "@/lib/permissions"

export default async function TrackingPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const role = session.user.role as any
  if (!isAdmin(role) && !hasPermission(role, permissionResources.VEHICLES, permissionActions.READ)) {
    redirect("/unauthorized")
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">لوحة مراقبة التتبع</h1>
            <p className="text-sm text-muted-foreground">
              الحالة الحية للمركبات · ربوط الأجهزة · دفعات التتبع
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0 self-start">
          <Link href="/tracking-simulator">محاكي الموبايل</Link>
        </Button>
      </div>

      <TrackingMonitor />
    </div>
  )
}
