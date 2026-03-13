import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { hasPermission, isAdmin, isOrganizationAdmin, isBranchAdmin } from "@/lib/permissions"
import { permissionResources, permissionActions } from "@/constants/permissions"
import { SurveyBuilder } from "@/components/surveys/survey-builder"

export default async function EditSurveyPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const role = session.user?.role as any
  const canUpdate =
    isAdmin(role) ||
    (isOrganizationAdmin(role) && hasPermission(role, permissionResources.FORMS, permissionActions.UPDATE)) ||
    (isBranchAdmin(role) && hasPermission(role, permissionResources.FORMS, permissionActions.UPDATE))
  if (!canUpdate) redirect("/unauthorized")

  const surveyId = params.id
  return (
    <div className="text-right max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">تعديل الاستبيان</h1>
        <p className="text-muted-foreground mt-1">تعديل العنوان والأسئلة</p>
      </div>
      <SurveyBuilder surveyId={surveyId} />
    </div>
  )
}
