import { NextResponse } from "next/server"
import { requireAuth, handleApiError } from "@/lib/middleware/api-auth.middleware"
import connectDB from "@/lib/mongodb"
import Role from "@/models/Role"

/**
 * GET /api/roles/[id]/name - Get role name (public endpoint for authenticated users)
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult

    await connectDB()
    const role = await Role.findById(params.id).select("nameAr name").lean()
    
    if (!role) {
      return NextResponse.json({ error: "الدور غير موجود" }, { status: 404 })
    }

    return NextResponse.json({ 
      data: {
        nameAr: role.nameAr || role.name,
        name: role.name
      }
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

