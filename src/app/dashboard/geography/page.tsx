import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { hasAnyPermission, isAdmin, isOrganizationAdmin, isBranchAdmin } from "@/lib/permissions"
import { GeographyManager } from "@/components/municipality/geography-manager"
import { permissionResources, permissionActions } from "@/constants/permissions"

export default async function GeographyPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const role = session.user.role as any
  const allowed =
    isAdmin(role) ||
    isOrganizationAdmin(role) ||
    (isBranchAdmin(role) &&
      hasAnyPermission(role, [
        { resource: permissionResources.GOVERNORATES, action: permissionActions.READ },
        { resource: permissionResources.CITIES, action: permissionActions.READ },
        { resource: permissionResources.ROUTE_ZONES, action: permissionActions.READ },
      ]))

  if (!allowed) {
    redirect("/unauthorized")
  }

  return (
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">الإدارة الجغرافية</h1>
        <p className="text-muted-foreground mt-2">
          إدارة المحافظات والمدن والمناطق (محافظة → مدينة → منطقة)
        </p>
      </div>
      <GeographyManager />
    </div>
  )
}
