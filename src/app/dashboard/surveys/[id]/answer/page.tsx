import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { hasPermission, isAdmin } from "@/lib/permissions"
import { permissionResources, permissionActions } from "@/constants/permissions"
import { SurveyAnswerForm } from "@/components/surveys/survey-answer-form"

export default async function SurveyAnswerPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const role = session.user?.role as any
  const canRead = isAdmin(role) || hasPermission(role, permissionResources.FORMS, permissionActions.READ)
  const canSubmit = hasPermission(role, permissionResources.FORM_SUBMISSIONS, permissionActions.CREATE)
  if (!canRead && !canSubmit) redirect("/unauthorized")

  const surveyId = params.id
  return (
    <div className="text-right max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">الإجابة على الاستبيان</h1>
        <p className="text-muted-foreground mt-1">املأ الأسئلة وحدد الموقع على الخريطة</p>
      </div>
      <SurveyAnswerForm surveyId={surveyId} />
    </div>
  )
}
