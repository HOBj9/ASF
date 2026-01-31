import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/permissions"
import connectDB from "@/lib/mongodb"
// Import models to ensure they are registered
import "@/models"
import User from "@/models/User"
import { UsersTable } from "@/components/admin/users-table"

export default async function UsersPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const userIsAdmin = isAdmin(session.user.role as any)

  if (!userIsAdmin) {
    redirect("/unauthorized")
  }

  await connectDB()
  const users = await User.find({}).populate("role").lean()

  return (
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">إدارة المستخدمين</h1>
        <p className="text-muted-foreground mt-2">عرض وإدارة المستخدمين في النظام</p>
      </div>
      <UsersTable users={JSON.parse(JSON.stringify(users))} />
    </div>
  )
}

