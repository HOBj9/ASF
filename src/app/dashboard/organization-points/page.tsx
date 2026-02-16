import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { hasPermission, isAdmin } from "@/lib/permissions"
import { permissionActions, permissionResources } from "@/constants/permissions"
import { OrganizationPointsManager } from "@/components/surveys/organization-points-manager"

export default async function OrganizationPointsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  const role = session.user?.role as any
  if (!isAdmin(role) && !hasPermission(role, permissionResources.POINTS, permissionActions.READ)) {
    redirect("/unauthorized")
  }

  return (
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">نقاط المؤسسة</h1>
        <p className="text-muted-foreground mt-2">النقاط على مستوى المؤسسة ونسخها إلى الفروع ونقلها إلى أثر</p>
      </div>
      <OrganizationPointsManager />
    </div>
  )
}
