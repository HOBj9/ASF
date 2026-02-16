import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { hasPermission, isAdmin, isOrganizationAdmin } from "@/lib/permissions"
import { permissionResources, permissionActions } from "@/constants/permissions"
import { SurveyBuilder } from "@/components/surveys/survey-builder"

export default async function NewSurveyPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const role = session.user?.role as any
  const canCreate =
    isAdmin(role) ||
    (isOrganizationAdmin(role) && hasPermission(role, permissionResources.FORMS, permissionActions.CREATE))
  if (!canCreate) redirect("/unauthorized")

  return (
    <div className="text-right max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">إنشاء استبيان جديد</h1>
        <p className="text-muted-foreground mt-1">مسح النقاط — أضف الأسئلة وحدد نوع كل سؤال</p>
      </div>
      <SurveyBuilder />
    </div>
  )
}
