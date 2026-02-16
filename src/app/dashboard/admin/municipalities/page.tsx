import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { hasAnyPermission, isAdmin } from "@/lib/permissions"
import { MunicipalitiesTable } from "@/components/admin/municipalities-table"
import { permissionActions, permissionResources } from "@/constants/permissions"
import { getLabelsForSession } from "@/lib/utils/labels-server.util"

export default async function BranchesPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const role = session.user.role as any
  const allowed =
    isAdmin(role) ||
    hasAnyPermission(role, [{ resource: permissionResources.BRANCHES, action: permissionActions.READ }])

  if (!allowed) {
    redirect("/unauthorized")
  }
  const labels = await getLabelsForSession(session)

  return (
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">إدارة {labels.branchLabel}</h1>
        <p className="text-muted-foreground mt-2">إضافة وتحديث وحذف {labels.branchLabel} وإنشاء مستخدم مدير لكل {labels.branchLabel}</p>
      </div>
      <MunicipalitiesTable />
    </div>
  )
}
