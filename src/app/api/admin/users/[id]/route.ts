import { NextResponse } from "next/server"
import { requireAdmin, handleApiError } from "@/lib/middleware/api-auth.middleware"
import { UserService } from "@/lib/services/user.service"
import { messages } from "@/constants/messages"
import connectDB from "@/lib/mongodb"

const userService = new UserService()

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdmin()
    if (authResult instanceof NextResponse) return authResult

    const body = await request.json()
    const { session } = authResult
    
    // Prevent admin from disabling themselves
    if (body.isActive === false && String(params.id) === String(session.user.id)) {
      // Check if user is admin
      await connectDB()
      const targetUser = await userService.getById(params.id)
      if (targetUser) {
        const Role = (await import('@/models/Role')).default
        const role = await Role.findById(targetUser.role).lean()
        const { isAdmin } = await import('@/lib/permissions')
        if (isAdmin(role as any)) {
          return NextResponse.json(
            { error: 'لا يمكنك تعطيل حسابك الخاص كمدير' },
            { status: 400 }
          )
        }
      }
    }
    
    // Handle toggle active status (backward compatibility - when no value is sent)
    if (body.isActive === undefined && Object.keys(body).length === 0) {
      // Prevent admin from disabling themselves via toggle
      await connectDB()
      const targetUser = await userService.getById(params.id)
      if (targetUser && String(params.id) === String(session.user.id)) {
        const Role = (await import('@/models/Role')).default
        const role = await Role.findById(targetUser.role).lean()
        const { isAdmin } = await import('@/lib/permissions')
        if (isAdmin(role as any) && targetUser.isActive) {
          return NextResponse.json(
            { error: 'لا يمكنك تعطيل حسابك الخاص كمدير' },
            { status: 400 }
          )
        }
      }
      
      const user = await userService.toggleActiveStatus(params.id)
      if (!user) {
        return NextResponse.json({ error: messages.users.notFound }, { status: 404 })
      }
      
      // Convert user to plain object and ensure _id is string
      const userObj = user as any
      if (userObj._id) {
        userObj._id = userObj._id.toString()
      }
      if (userObj.role && userObj.role._id) {
        userObj.role._id = userObj.role._id.toString()
      }
      
      return NextResponse.json({ 
        message: messages.success.updated, 
        data: { user: userObj } 
      })
    }

    // Prevent admin from disabling themselves (check in full update too)
    if (body.isActive === false && String(params.id) === String(session.user.id)) {
      await connectDB()
      const targetUser = await userService.getById(params.id)
      if (targetUser) {
        const Role = (await import('@/models/Role')).default
        const role = await Role.findById(targetUser.role).lean()
        const { isAdmin } = await import('@/lib/permissions')
        if (isAdmin(role as any)) {
          return NextResponse.json(
            { error: 'لا يمكنك تعطيل حسابك الخاص كمدير' },
            { status: 400 }
          )
        }
      }
    }

    // Full update (including isActive with specific value)
    const user = await userService.update(params.id, body)
    if (!user) {
      return NextResponse.json({ error: messages.users.notFound }, { status: 404 })
    }

    // Convert user to plain object and ensure _id is string
    const userObj = user as any
    if (userObj._id) {
      userObj._id = userObj._id.toString()
    }
    if (userObj.role && userObj.role._id) {
      userObj.role._id = userObj.role._id.toString()
    }

    return NextResponse.json({ 
      message: messages.success.updated, 
      data: { user: userObj } 
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

    // Prevent deleting yourself
    if (authResult.session.user.id === params.id) {
      return NextResponse.json(
        { error: messages.users.deleteSelf },
        { status: 400 }
      )
    }

    const deleted = await userService.delete(params.id)
    if (!deleted) {
      return NextResponse.json({ error: messages.users.notFound }, { status: 404 })
    }

    return NextResponse.json({ message: messages.success.deleted })
  } catch (error: any) {
    return handleApiError(error)
  }
}

