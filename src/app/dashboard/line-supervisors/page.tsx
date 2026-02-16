import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAdmin, isOrganizationAdmin } from "@/lib/permissions"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Role from "@/models/Role"
import { resolveOrganizationId } from "@/lib/utils/organization.util"
import { getLabelsForSession } from "@/lib/utils/labels-server.util"
import { LineSupervisorsManager } from "@/components/dashboard/line-supervisors-manager"

export default async function LineSupervisorsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  const role = session.user.role as any
  const allowed = isAdmin(role) || isOrganizationAdmin(role)
  if (!allowed) {
    redirect("/unauthorized")
  }

  let organizationId: string
  try {
    organizationId = await resolveOrganizationId(session)
  } catch {
    redirect("/unauthorized")
  }

  await connectDB()
  const labels = await getLabelsForSession(session)
  const lineSupervisorRole = await Role.findOne({ name: "line_supervisor" }).select("_id").lean()
  const initialUsers = lineSupervisorRole
    ? await User.find({
        organizationId,
        branchId: null,
        role: (lineSupervisorRole as any)._id,
      })
        .populate("role", "name nameAr")
        .sort({ createdAt: -1 })
        .lean()
    : []

  return (
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">{labels.lineSupervisorLabel}</h1>
        <p className="text-muted-foreground mt-2">عرض وإضافة {labels.lineSupervisorLabel} المرتبطين بمؤسستك</p>
      </div>
      <LineSupervisorsManager
        organizationId={organizationId}
        initialUsers={JSON.parse(JSON.stringify(initialUsers))}
      />
    </div>
  )
}
