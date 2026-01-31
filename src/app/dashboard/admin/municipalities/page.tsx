import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/permissions"
import { MunicipalitiesTable } from "@/components/admin/municipalities-table"

export default async function MunicipalitiesPage() {
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
        <h1 className="text-2xl lg:text-3xl font-bold">إدارة البلديات</h1>
        <p className="text-muted-foreground mt-2">إضافة وتحديث وحذف البلديات</p>
      </div>
      <MunicipalitiesTable />
    </div>
  )
}
