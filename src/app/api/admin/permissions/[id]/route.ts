import { NextResponse } from "next/server"
import { requireAdmin, handleApiError } from "@/lib/middleware/api-auth.middleware"
import { PermissionService } from "@/lib/services/permission.service"
import { messages } from "@/constants/messages"
import { permissionActions } from "@/constants/permissions"

const permissionService = new PermissionService()

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdmin()
    if (authResult instanceof NextResponse) return authResult

    const permission = await permissionService.getById(params.id)
    if (!permission) {
      return NextResponse.json({ error: messages.permissions.notFound }, { status: 404 })
    }

    return NextResponse.json({ permission })
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

    // Validate action if provided
    if (body.action) {
      const validActions = Object.values(permissionActions)
      if (!validActions.includes(body.action)) {
        return NextResponse.json(
          { error: `الإجراء يجب أن يكون واحداً من: ${validActions.join(', ')}` },
          { status: 400 }
        )
      }
    }

    const permission = await permissionService.update(params.id, body)
    if (!permission) {
      return NextResponse.json({ error: messages.permissions.notFound }, { status: 404 })
    }

    return NextResponse.json({
      message: messages.success.updated,
      permission,
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

    const deleted = await permissionService.delete(params.id)
    if (!deleted) {
      return NextResponse.json({ error: messages.permissions.notFound }, { status: 404 })
    }

    return NextResponse.json({ message: messages.success.deleted })
  } catch (error: any) {
    return handleApiError(error)
  }
}

