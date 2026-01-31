import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { RoutePointsManager } from "@/components/municipality/route-points-manager"
import { hasPermission, isAdmin } from "@/lib/permissions"
import { permissionActions, permissionResources } from "@/constants/permissions"

export default async function RoutePointsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  const role = session.user.role as any
  if (!isAdmin(role) && !hasPermission(role, permissionResources.ROUTES, permissionActions.UPDATE)) {
    redirect("/unauthorized")
  }

  return (
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">ترتيب حاويات المسار</h1>
        <p className="text-muted-foreground mt-2">اختر الحاويات وحدد ترتيبها داخل المسار</p>
      </div>
      <RoutePointsManager routeId={params.id} />
    </div>
  )
}
