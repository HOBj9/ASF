import type { ReactNode } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import { isLineSupervisor, isOrganizationAdmin, isAdmin, isBranchAdmin } from "@/lib/permissions"
import { resolveOrganizationId } from "@/lib/utils/organization.util"
import { ProfileManager } from "@/components/profile/profile-manager"
import { OrganizationLabelsSettings } from "@/components/settings/organization-labels-settings"
import { NotificationSettings } from "@/components/settings/notification-settings"
import { LineSupervisorsManager } from "@/components/dashboard/line-supervisors-manager"
import { getLabelsForSession } from "@/lib/utils/labels-server.util"
import { loadLineSupervisorsDataset } from "@/lib/server/line-supervisors-dataset"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  await connectDB()
  const user = await User.findById(session.user.id)
    .select("name email avatar businessName")
    .lean()

  const role = session.user.role as any
  const hideLabelsAndNotifications = isLineSupervisor(role)
  const showLineSupervisorsBlock =
    !hideLabelsAndNotifications &&
    (isOrganizationAdmin(role) || isAdmin(role) || isBranchAdmin(role))

  let lineSupervisorsSection: ReactNode = null
  if (showLineSupervisorsBlock) {
    try {
      const organizationId = await resolveOrganizationId(session)
      const labels = await getLabelsForSession(session)
      const { initialUsers, branches, vehicles } = await loadLineSupervisorsDataset(organizationId)
      const sessionBranchId = (session.user as { branchId?: string | null })?.branchId ?? null
      lineSupervisorsSection = (
        <div>
          <h2 className="text-xl font-semibold mb-3">
            {labels.lineSupervisorLabel || "مشرفو الخط"}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            إدارة {labels.lineSupervisorLabel || "مشرفي الخط"} وبياناتهم وربطهم بالفرع والمركبة.
            {!sessionBranchId ? ` على مستوى المؤسسة اختر ${labels.branchLabel || "الفرع"} لعرض القائمة.` : ""}
          </p>
          <LineSupervisorsManager
            organizationId={organizationId}
            initialUsers={initialUsers}
            branches={branches}
            vehicles={vehicles}
            sessionBranchId={sessionBranchId}
          />
        </div>
      )
    } catch {
      lineSupervisorsSection = null
    }
  }

  return (
    <div className="text-right space-y-8">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground mt-2">
          {hideLabelsAndNotifications ? "إدارة الملف الشخصي" : "إدارة الملف الشخصي وتسميات المؤسسة"}
        </p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">الملف الشخصي</h2>
        <ProfileManager
          initialUser={{
            id: session.user.id,
            name: user?.name || session.user.name || "",
            email: user?.email || session.user.email || "",
            avatar: user?.avatar || undefined,
            businessName: (user as any)?.businessName || undefined,
          }}
        />
      </div>

      {!hideLabelsAndNotifications && (
        <>
          <div>
            <h2 className="text-xl font-semibold mb-3">تسميات المؤسسة</h2>
            <OrganizationLabelsSettings />
          </div>

          {lineSupervisorsSection}

          <div>
            <h2 className="text-xl font-semibold mb-3">تخصيص الإشعارات</h2>
            <NotificationSettings />
          </div>
        </>
      )}

    </div>
  )
}

