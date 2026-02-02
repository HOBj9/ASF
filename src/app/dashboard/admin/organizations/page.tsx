import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/permissions"
import { OrganizationsTable } from "@/components/admin/organizations-table"

export default async function OrganizationsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const userIsAdmin = isAdmin(session.user.role as any)
  if (!userIsAdmin) {
    redirect("/unauthorized")
  }

  return (
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">إدارة المؤسسات</h1>
        <p className="text-muted-foreground mt-2">إنشاء المؤسسات وتعديل تسمياتها العامة</p>
      </div>
      <OrganizationsTable />
    </div>
  )
}
