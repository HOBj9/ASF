import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { hasAnyPermission, isAdmin, isOrganizationAdmin, isBranchAdmin } from "@/lib/permissions"
import { WorkSchedulesManager } from "@/components/municipality/work-schedules-manager"
import { permissionResources, permissionActions } from "@/constants/permissions"

export default async function WorkSchedulesPage() {
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
        { resource: permissionResources.WORK_SCHEDULES, action: permissionActions.READ },
      ]))

  if (!allowed) {
    redirect("/unauthorized")
  }

  return (
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">أيام العمل</h1>
        <p className="text-muted-foreground mt-2">
          إدارة جداول أيام العمل وساعات الدوام (موروثة من المؤسسة أو خاصة بالفرع)
        </p>
      </div>
      <WorkSchedulesManager />
    </div>
  )
}
