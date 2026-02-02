import { NextResponse } from "next/server"
import { appConfig } from "@/lib/config/app.config"
import { messages } from "@/constants/messages"
import { AuthService } from "@/lib/services/auth.service"
import { handleApiError } from "@/lib/middleware/api-auth.middleware"

const authService = new AuthService()

export async function POST(request: Request) {
  try {
    // Check if registration is enabled
    if (!appConfig.features.registration) {
      return NextResponse.json(
        { error: messages.errors.forbidden },
        { status: 403 }
      )
    }

    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: messages.auth.register.required },
        { status: 400 }
      )
    }

    const user = await authService.register({ name, email, password })

    return NextResponse.json(
      { message: messages.auth.register.success, userId: user._id.toString() },
      { status: 201 }
    )
  } catch (error: any) {
    return handleApiError(error)
  }
}

