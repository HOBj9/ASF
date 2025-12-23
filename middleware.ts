import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { routes } from "@/constants/routes"
import { isAdmin } from "@/lib/permissions"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Check if user is active (for protected routes only)
    if (token?.id && path !== routes.public.login && path !== routes.public.register && path !== routes.public.home) {
      try {
        await connectDB()
        const user = await User.findById(token.id).select('isActive').lean()
        
        if (!user || !user.isActive) {
          // User is disabled, redirect to login
          return NextResponse.redirect(new URL(`${routes.public.login}?error=account_disabled`, req.url))
        }
      } catch (error) {
        // If there's an error checking user status, allow the request to proceed
        // This prevents blocking legitimate requests due to DB issues
        console.error('Error checking user active status:', error)
      }
    }

    // Admin routes require admin role (both /admin and /dashboard/admin)
    if (path.startsWith('/admin') || path.startsWith(routes.admin.users) || path.startsWith(routes.admin.roles) || path.startsWith(routes.admin.permissions)) {
      if (!token?.role) {
        return NextResponse.redirect(new URL(routes.public.login, req.url))
      }

      // Check if user is admin
      const userIsAdmin = isAdmin(token.role as any)

      if (!userIsAdmin) {
        return NextResponse.redirect(new URL(routes.protected.unauthorized, req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname

        // Public routes
        if (path === routes.public.login || path === routes.public.register || path === routes.public.home) {
          return true
        }

        // Protected routes require authentication
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

