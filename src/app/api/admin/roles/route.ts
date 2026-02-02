import { NextResponse } from "next/server"
import { requireAdmin, handleApiError } from "@/lib/middleware/api-auth.middleware"
import { RoleService } from "@/lib/services/role.service"
import { messages } from "@/constants/messages"

const roleService = new RoleService()

export async function GET() {
  try {
    const authResult = await requireAdmin()
    if (authResult instanceof NextResponse) return authResult

    const roles = await roleService.getAll()
    return NextResponse.json({ data: { roles } })
  } catch (error: any) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin()
    if (authResult instanceof NextResponse) return authResult

    const { name, nameAr, permissions } = await request.json()

    if (!name || !nameAr) {
      return NextResponse.json(
        { error: `${messages.roles.name} ${messages.common.required}` },
        { status: 400 }
      )
    }

    const role = await roleService.create({
      name,
      nameAr,
      permissions: permissions || [],
    })

    const populatedRole = await roleService.getById(role._id.toString())

    return NextResponse.json(
      { message: messages.success.created, role: populatedRole },
      { status: 201 }
    )
  } catch (error: any) {
    return handleApiError(error)
  }
}

