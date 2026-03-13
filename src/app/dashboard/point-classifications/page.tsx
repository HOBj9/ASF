import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PointClassificationsManager } from "@/components/settings/point-classifications-manager"
import { hasPermission, isAdmin, isOrganizationAdmin } from "@/lib/permissions"
import { permissionActions, permissionResources } from "@/constants/permissions"

export default async function PointClassificationsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const hasAccess =
    isAdmin(session.user?.role as any) ||
    isOrganizationAdmin(session.user?.role as any) ||
    hasPermission(session.user?.role as any, permissionResources.POINT_CLASSIFICATIONS, permissionActions.READ)

  if (!hasAccess) {
    redirect("/dashboard")
  }

  return (
    <div className="text-right space-y-6">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">فئات النقاط الأساسية والفرعية</h1>
        <p className="text-muted-foreground mt-2">إدارة الفئات الأساسية والفرعية للنقاط</p>
      </div>

      <PointClassificationsManager />
    </div>
  )
}
