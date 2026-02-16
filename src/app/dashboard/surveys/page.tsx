import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { hasPermission, isAdmin } from "@/lib/permissions"
import { permissionActions, permissionResources } from "@/constants/permissions"
import { SurveysListManager } from "@/components/surveys/surveys-list-manager"

export default async function SurveysPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  const role = session.user?.role as any
  if (!isAdmin(role) && !hasPermission(role, permissionResources.FORMS, permissionActions.READ)) {
    redirect("/unauthorized")
  }

  return (
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">الاستبيانات</h1>
        <p className="text-muted-foreground mt-2">مسح النقاط — الإجابة على الاستبيانات أو إدارتها</p>
      </div>
      <SurveysListManager />
    </div>
  )
}
