import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAdmin, isOrganizationAdmin, hasPermission } from "@/lib/permissions"
import { permissionActions, permissionResources } from "@/constants/permissions"
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

  if (!userIsAdmin && !hasPermission(role, permissionResources.DASHBOARD, permissionActions.READ)) {
    redirect("/dashboard/surveys")
  }

  // Fetch users if admin
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
          organizationId={(session.user as any)?.organizationId ?? null}
        />
      )}
    </div>
  )
}
