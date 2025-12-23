import { NextResponse } from "next/server"
import { requireAdmin, handleApiError } from "@/lib/middleware/api-auth.middleware"
import { UserService } from "@/lib/services/user.service"
import { successResponse } from "@/lib/utils/api.util"

const userService = new UserService()

export async function GET() {
  try {
    const authResult = await requireAdmin()
    if (authResult instanceof NextResponse) return authResult

    const users = await userService.getAll()
    return NextResponse.json({ users })
  } catch (error: any) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin()
    if (authResult instanceof NextResponse) return authResult

    const body = await request.json()
    const { name, email, phone, password, role, isActive } = body

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "جميع الحقول مطلوبة" },
        { status: 400 }
      )
    }

    const user = await userService.create({
      name,
      email,
      phone: phone || undefined,
      password,
      role,
      isActive: isActive ?? true,
    })

    return successResponse({ user })
  } catch (error: any) {
    return handleApiError(error)
  }
}

