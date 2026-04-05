import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAdmin, isOrganizationAdmin, isBranchAdmin } from "@/lib/permissions"
import { resolveOrganizationId } from "@/lib/utils/organization.util"
import { getLabelsForSession } from "@/lib/utils/labels-server.util"
import { LineSupervisorsManager } from "@/components/dashboard/line-supervisors-manager"
import { loadLineSupervisorsDataset } from "@/lib/server/line-supervisors-dataset"

export default async function LineSupervisorsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  const role = session.user.role as unknown
  const allowed = isAdmin(role as any) || isOrganizationAdmin(role as any) || isBranchAdmin(role as any)
  if (!allowed) {
    redirect("/unauthorized")
  }

  let organizationId: string
  try {
    organizationId = await resolveOrganizationId(session)
  } catch {
    redirect("/unauthorized")
  }

  const labels = await getLabelsForSession(session)
  const { initialUsers, branches, vehicles } = await loadLineSupervisorsDataset(organizationId)
  const sessionBranchId = (session.user as { branchId?: string | null })?.branchId ?? null

  return (
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">{labels.lineSupervisorLabel}</h1>
        <p className="text-muted-foreground mt-2">
          عرض وإضافة {labels.lineSupervisorLabel} مع بياناتهم وربطهم بالفرع والمركبة.
          {!sessionBranchId
            ? ` على مستوى المؤسسة اختر ${labels.branchLabel || "الفرع"} أولاً لعرض القائمة.`
            : ""}
        </p>
      </div>
      <LineSupervisorsManager
        organizationId={organizationId}
        initialUsers={initialUsers}
        branches={branches}
        vehicles={vehicles}
        sessionBranchId={sessionBranchId}
      />
    </div>
  )
}
