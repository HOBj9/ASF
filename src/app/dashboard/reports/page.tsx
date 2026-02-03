import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ReportsPanel } from "@/components/municipality/reports-panel"
import { hasPermission, isAdmin } from "@/lib/permissions"
import { permissionActions, permissionResources } from "@/constants/permissions"

export default async function ReportsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  const role = session.user.role as any
  const adminUser = isAdmin(role)
  if (!adminUser && !hasPermission(role, permissionResources.REPORTS, permissionActions.READ)) {
    redirect("/unauthorized")
  }

  return (
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">التقارير</h1>
        <p className="text-muted-foreground mt-2">تحميل تقارير CSV يومية وأسبوعية وشهرية ومخصصة</p>
      </div>
      <ReportsPanel isSystemAdmin={adminUser} />
    </div>
  )
}
