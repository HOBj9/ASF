export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server"
import { requireAdmin, handleApiError } from "@/lib/middleware/api-auth.middleware"
import { PermissionService } from "@/lib/services/permission.service"
import { messages } from "@/constants/messages"
import { permissionActions } from "@/constants/permissions"

const permissionService = new PermissionService()

export async function GET() {
  try {
    const authResult = await requireAdmin()
    if (authResult instanceof NextResponse) return authResult

    const permissions = await permissionService.getAll()
    return NextResponse.json({ data: { permissions } })
  } catch (error: any) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin()
    if (authResult instanceof NextResponse) return authResult

    const { name, nameAr, resource, action } = await request.json()

    if (!name || !nameAr || !resource || !action) {
      return NextResponse.json(
        { error: messages.common.required },
        { status: 400 }
      )
    }

    const validActions = Object.values(permissionActions)
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `الإجراء يجب أن يكون واحداً من: ${validActions.join(', ')}` },
        { status: 400 }
      )
    }

    const permission = await permissionService.create({
      name,
      nameAr,
      resource,
      action,
    })

    return NextResponse.json(
      { message: messages.success.created, permission },
      { status: 201 }
    )
  } catch (error: any) {
    return handleApiError(error)
  }
}

