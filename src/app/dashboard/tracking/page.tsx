import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
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
    <div className="text-right">
      <div className="mb-6 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">لوحة مراقبة التتبع</h1>
          <p className="mt-2 text-muted-foreground">
            راقب الحالة الحية للمركبات، وربوط التتبع، وآخر الدفعات الواردة من المزوّدات المدعومة.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/tracking-simulator">فتح محاكي الموبايل</Link>
        </Button>
      </div>
      <TrackingMonitor />
    </div>
  )
}
