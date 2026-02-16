import { NextResponse } from "next/server"
import { requireAuth, handleApiError } from "@/lib/middleware/api-auth.middleware"
import { SurveyService } from "@/lib/services/survey.service"
import { permissionActions, permissionResources } from "@/constants/permissions"
import { isAdmin, isLineSupervisor, hasPermission } from "@/lib/permissions"
import connectDB from "@/lib/mongodb"
import Branch from "@/models/Branch"
import SurveySubmission from "@/models/SurveySubmission"

const surveyService = new SurveyService()

async function ensureOrgAccess(session: any, organizationId: string): Promise<void> {
  if (isAdmin(session?.user?.role)) return
  const sessionOrg = session?.user?.organizationId?.toString?.()
  if (sessionOrg === organizationId) return
  const branchId = session?.user?.branchId?.toString?.()
  if (branchId) {
    await connectDB()
    const branch = await Branch.findById(branchId).select("organizationId").lean()
    if (branch && String(branch.organizationId) === organizationId) return
  }
  throw new Error("لا يمكنك الوصول إلى هذه المؤسسة")
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; surveyId: string }> }
) {
  try {
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult

    const { session } = authResult
    const { id: organizationId, surveyId } = await params
    await ensureOrgAccess(session, organizationId)

    const isLineSup = isLineSupervisor(session?.user?.role as any)
    if (!isLineSup && !hasPermission(session?.user?.role as any, permissionResources.FORM_SUBMISSIONS, permissionActions.READ)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 })
    }

    let submissions: any[]
    if (isLineSup && session?.user?.id) {
      await connectDB()
      submissions = await SurveySubmission.find({ surveyId, organizationId, userId: session.user.id })
        .sort({ createdAt: -1 })
        .populate("userId", "name email")
        .lean()
        .exec()
    } else {
      submissions = await surveyService.listSubmissions(surveyId, organizationId)
    }
    return NextResponse.json({
      submissions: submissions.map((s: any) => ({
        _id: s._id,
        surveyId: s.surveyId,
        userId: s.userId,
        mapLat: s.mapLat,
        mapLng: s.mapLng,
        deviceLat: s.deviceLat,
        deviceLng: s.deviceLng,
        answers: s.answers,
        pointId: s.pointId ?? null,
        createdAt: s.createdAt,
      })),
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}
