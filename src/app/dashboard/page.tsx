import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAdmin, isOrganizationAdmin, isLineSupervisor } from "@/lib/permissions"
import { AdminOverview } from "@/components/dashboard/admin-overview"
import { UserDashboard } from "@/components/dashboard/user-dashboard"
import connectDB from "@/lib/mongodb"
import "@/models"
import User from "@/models/User"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const role = session.user.role as any
  const userIsAdmin = isAdmin(role)

  // Show dashboard for everyone: admin sees AdminOverview; others see UserDashboard (map/branch data or line-supervisor message)
  let users: any[] = []
  if (userIsAdmin) {
    await connectDB()
    users = await User.find({}).populate("role").lean()
  }

  return (
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">
          مرحباً، {session.user.name && !/^[\s?]+$/.test(String(session.user.name).trim()) ? session.user.name : 'مستخدم'}
        </h1>
        <p className="text-muted-foreground mt-2">مرحباً بك في لوحة التحكم</p>
      </div>

      {userIsAdmin ? (
        <AdminOverview initialUsers={JSON.parse(JSON.stringify(users))} />
      ) : (
        <UserDashboard
          isOrganizationAdmin={isOrganizationAdmin(role)}
          isLineSupervisor={isLineSupervisor(role)}
          organizationId={(session.user as any)?.organizationId ?? null}
          sessionBranchId={(session.user as any)?.branchId ?? null}
        />
      )}
    </div>
  )
}
