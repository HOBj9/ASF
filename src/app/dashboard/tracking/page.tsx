import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { hasPermission, isAdmin } from "@/lib/permissions"
import { permissionActions, permissionResources } from "@/constants/permissions"
import { TrackingMonitor } from "@/components/dashboard/tracking-monitor"

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
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl font-bold lg:text-3xl">مراقبة التتبع</h1>
        <p className="mt-2 text-muted-foreground">
          متابعة الحالة الحية للمركبات، ربوط الأجهزة، وسجل الدفعات الواردة من مزودات التتبع المختلفة.
        </p>
      </div>
      <TrackingMonitor />
    </div>
  )
}
