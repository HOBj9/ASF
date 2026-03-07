import { NextResponse } from "next/server"
import { requirePermission, handleApiError } from "@/lib/middleware/api-auth.middleware"
import { permissionActions, permissionResources } from "@/constants/permissions"
import { isAdmin, isLineSupervisor } from "@/lib/permissions"
import connectDB from "@/lib/mongodb"
import Branch from "@/models/Branch"
import Point from "@/models/Point"
import SurveySubmission from "@/models/SurveySubmission"
import Vehicle from "@/models/Vehicle"
import { PointService } from "@/lib/services/point.service"
import { AtharService } from "@/lib/services/athar.service"

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
      permissionResources.POINTS,
      permissionActions.TRANSFER_TO_ATHAR
    )
    if (authResult instanceof NextResponse) return authResult

    const { session } = authResult
    if (isLineSupervisor(session?.user?.role as any)) {
      return NextResponse.json(
        { error: "غير مصرح لمشرف الخط بتحويل الرد إلى نقطة ثم إلى أثر" },
        { status: 403 }
      )
    }
    const userId = session?.user?.id ?? undefined
    const { id: organizationId, submissionId } = await params
    await ensureOrgAccess(session, organizationId)

    await connectDB()
    let submission = await SurveySubmission.findOne({
      _id: submissionId,
      organizationId,
    }).lean()
    if (!submission) {
      return NextResponse.json({ error: "الإرسالة غير موجودة" }, { status: 404 })
    }

    let pointId = submission.pointId?.toString?.()
    if (!pointId) {
      const answers = submission.answers && typeof submission.answers === "object"
        ? (submission.answers as Record<string, unknown>)
        : {}
      const nameFromAnswers = String(
        answers.pointName ?? answers.name ?? answers.question_0 ?? ""
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
        primaryClassificationId: answers.primaryClassificationId || null,
        secondaryClassificationId: answers.secondaryClassificationId || null,
        otherIdentifier: answers.otherIdentifier || null,
      })
      pointId = point._id.toString()

      await SurveySubmission.updateOne(
        { _id: submissionId, organizationId },
        { $set: { pointId: point._id } }
      )
    }

    const orgPoint = await Point.findOne({
      _id: pointId,
      organizationId,
      branchId: null,
    }).lean()
    if (!orgPoint) {
      return NextResponse.json({ error: "النقطة غير موجودة" }, { status: 404 })
    }

    const pushed = await pointService.pushPointToAllBranches(organizationId, pointId)

    const branches = await Branch.find({ organizationId, isActive: true }).lean().exec()
    const branchesWithAthar = branches.filter((b) => b.atharKey && String(b.atharKey).trim())
    const branchIds = branchesWithAthar.map((b) => b._id.toString())
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000"}/api/athar/webhook`

    const branchPoints = await Point.find({
      branchId: { $in: branchIds },
      name: orgPoint.name,
      $or: [{ zoneId: null }, { zoneId: "" }],
    }).lean().exec()

    let zonesCreated = 0
    const errors: string[] = []

    for (const bp of branchPoints) {
      const bid = bp.branchId?.toString?.()
      if (!bid) continue
      try {
        const atharService = await AtharService.forBranch(bid)
        const pointName = bp.nameAr || bp.nameEn || bp.name || "نقطة"
        const radius = bp.radiusMeters ?? 500
        const zoneId = await atharService.ensureZone(
          pointName,
          { lat: Number(bp.lat), lng: Number(bp.lng) },
          radius
        )
        await pointService.update(String(bp._id), bid, { zoneId })

        const vehicles = await Vehicle.find({
          branchId: bid,
          imei: { $ne: null },
          isActive: true,
        })
          .select("imei name")
          .lean()

        for (const vehicle of vehicles) {
          if (!vehicle.imei) continue
          try {
            await atharService.createZoneEvent(pointName, zoneId, vehicle.imei, "zone_in", webhookUrl)
            await atharService.createZoneEvent(pointName, zoneId, vehicle.imei, "zone_out", webhookUrl)
          } catch (e) {
            console.warn("[convert-to-point-and-athar] zone event failed", e)
          }
        }
        zonesCreated++
      } catch (err: any) {
        errors.push(`فرع ${bid}: ${err?.message || "فشل"}`)
      }
    }

    const updatedSubmission = await SurveySubmission.findById(submissionId)
      .populate("userId", "name email")
      .lean()

    return NextResponse.json({
      pointId,
      pushed,
      zonesCreated,
      errors: errors.length > 0 ? errors : undefined,
      submission: updatedSubmission,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}
