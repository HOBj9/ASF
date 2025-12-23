import { NextResponse } from "next/server"
import { requireAdmin, handleApiError } from "@/lib/middleware/api-auth.middleware"
import { RoleService } from "@/lib/services/role.service"
import { messages } from "@/constants/messages"

const roleService = new RoleService()

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdmin()
    if (authResult instanceof NextResponse) return authResult

    const role = await roleService.getById(params.id)
    if (!role) {
      return NextResponse.json({ error: messages.roles.notFound }, { status: 404 })
    }

    return NextResponse.json({ role })
  } catch (error: any) {
    return handleApiError(error)
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdmin()
    if (authResult instanceof NextResponse) return authResult

    const body = await request.json()
    const role = await roleService.update(params.id, body)

    if (!role) {
      return NextResponse.json({ error: messages.roles.notFound }, { status: 404 })
    }

    return NextResponse.json({
      message: messages.success.updated,
      role,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdmin()
    if (authResult instanceof NextResponse) return authResult

    const deleted = await roleService.delete(params.id)
    if (!deleted) {
      return NextResponse.json({ error: messages.roles.notFound }, { status: 404 })
    }

    return NextResponse.json({ message: messages.success.deleted })
  } catch (error: any) {
    return handleApiError(error)
  }
}

