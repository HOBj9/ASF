import { NextResponse } from "next/server"
import { requirePermission, handleApiError } from "@/lib/middleware/api-auth.middleware"
import { permissionActions, permissionResources } from "@/constants/permissions"
import { isAdmin, isLineSupervisor } from "@/lib/permissions"
import connectDB from "@/lib/mongodb"
import Branch from "@/models/Branch"
import SurveySubmission from "@/models/SurveySubmission"
import { PointService } from "@/lib/services/point.service"

const pointService = new PointService()

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const authResult = await requirePermission(
      permissionResources.FORM_SUBMISSIONS,
      permissionActions.READ
    )
    if (authResult instanceof NextResponse) return authResult

    const { session } = authResult
    if (isLineSupervisor(session?.user?.role as any)) {
      return NextResponse.json({ error: "غير مصرح لمشرف الخط بتحويل الرد إلى نقطة" }, { status: 403 })
    }
    const userId = session?.user?.id ?? undefined
    const { id: organizationId, submissionId } = await params
    await ensureOrgAccess(session, organizationId)

    await connectDB()
    const submission = await SurveySubmission.findOne({
      _id: submissionId,
      organizationId,
    }).lean()
    if (!submission) {
      return NextResponse.json({ error: "الإرسالة غير موجودة" }, { status: 404 })
    }
    if (submission.pointId) {
      return NextResponse.json(
        { error: "تم تحويل هذا الرد إلى نقطة مسبقاً" },
        { status: 400 }
      )
    }

    const answers = submission.answers && typeof submission.answers === "object" ? submission.answers as Record<string, unknown> : {}
    const nameFromAnswers = String(
      (answers as any)?.name ?? (answers as any)?.question_0 ?? ""
    ).trim()
    const pointName =
      nameFromAnswers ||
      `نقطة من مسح – ${new Date().toLocaleDateString("ar-SY")}`

    const point = await pointService.createAtOrganization(organizationId, {
      name: pointName,
      lat: submission.mapLat,
      lng: submission.mapLng,
      type: "container",
      radiusMeters: 500,
      isActive: true,
      createdByUserId: userId ?? null,
    })

    await SurveySubmission.updateOne(
      { _id: submissionId, organizationId },
      { $set: { pointId: point._id } }
    )

    const updatedSubmission = await SurveySubmission.findById(submissionId)
      .populate("userId", "name email")
      .lean()

    return NextResponse.json({
      point: point.toObject ? point.toObject() : point,
      submission: updatedSubmission,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}
