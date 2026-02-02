import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PointsManager } from "@/components/municipality/points-manager"
import { hasPermission, isAdmin } from "@/lib/permissions"
import { permissionActions, permissionResources } from "@/constants/permissions"
import { getLabelsForSession } from "@/lib/utils/labels.util"

export default async function PointsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  const role = session.user.role as any
  if (!isAdmin(role) && !hasPermission(role, permissionResources.POINTS, permissionActions.READ)) {
    redirect("/unauthorized")
  }

  const labels = await getLabelsForSession(session)

  return (
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">إدارة {labels.pointLabel}</h1>
        <p className="text-muted-foreground mt-2">تعريف {labels.pointLabel} وإنشاء المناطق تلقائيًا عبر Athar</p>
      </div>
      <PointsManager />
    </div>
  )
}

