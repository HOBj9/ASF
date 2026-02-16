import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { hasPermission, isAdmin, isOrganizationAdmin, isLineSupervisor } from "@/lib/permissions"
import { permissionActions, permissionResources } from "@/constants/permissions"
import { resolveOrganizationId } from "@/lib/utils/organization.util"
import { getLabelsForSession } from "@/lib/utils/labels-server.util"
import { SurveySubmissionsManager } from "@/components/surveys/survey-submissions-manager"

type Props = { searchParams: Promise<{ surveyId?: string }> }

export default async function SurveyResponsesPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  const role = session.user?.role as any
  const canRead =
    isAdmin(role) ||
    isOrganizationAdmin(role) ||
    isLineSupervisor(role) ||
    hasPermission(role, permissionResources.FORM_SUBMISSIONS, permissionActions.READ)
  if (!canRead) {
    redirect("/unauthorized")
  }

  let organizationId: string
  try {
    organizationId = await resolveOrganizationId(session)
  } catch {
    redirect("/unauthorized")
  }

  const params = await searchParams
  const surveyId = params?.surveyId ?? null
  const labels = await getLabelsForSession(session)
  const surveyLabel = labels.surveyLabel
  const onlyMine = isLineSupervisor(role)
  const responsesTitle = onlyMine ? "ردودي" : `ردود ${surveyLabel}`
  const responsesDescription = onlyMine
    ? `عرض إرسالاتك فقط على ${surveyLabel}`
    : `عرض إرسالات ${surveyLabel} وتحويلها إلى نقاط على مستوى المؤسسة`

  return (
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">{responsesTitle}</h1>
        <p className="text-muted-foreground mt-2">{responsesDescription}</p>
      </div>
      <SurveySubmissionsManager organizationId={organizationId} initialSurveyId={surveyId} onlyMine={onlyMine} />
    </div>
  )
}
