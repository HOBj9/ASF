import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { authConfig } from "@/lib/config/auth.config"
import { messages } from "@/constants/messages"
import { routes } from "@/constants/routes"
import { AuthService } from "@/lib/services/auth.service"

const authService = new AuthService()

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: authConfig.providers.credentials.name,
      credentials: {
        email: { label: messages.auth.login.email, type: "email" },
        password: { label: messages.auth.login.password, type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error(messages.auth.login.required)
        }

        try {
          const user = await authService.validateCredentials(
            credentials.email,
            credentials.password
          )

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role as any,
            avatar: user.avatar || null,
          }
        } catch (error: any) {
          throw new Error(error.message || messages.auth.login.error)
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user && authConfig.callbacks.jwt.includeRole) {
        token.id = user.id
        token.role = user.role
        token.avatar = (user as any).avatar || null
        token.name = (user as any).name
        token.email = (user as any).email
        // Preserve original admin info when impersonating
        if ((user as any).originalAdminId) {
          token.originalAdminId = (user as any).originalAdminId
          token.originalAdminName = (user as any).originalAdminName
          token.originalAdminEmail = (user as any).originalAdminEmail
        }
      }
      
      // Handle session update (for impersonation)
      if (trigger === "update" && session) {
        // Check if session contains impersonation data (id, name, email, role, etc.)
        const sessionData = session as any
        
        // If session contains user data (from impersonation), update token
        if (sessionData.id || sessionData.name || sessionData.email || sessionData.role) {
          // Update token with new user data
          if (sessionData.id) token.id = sessionData.id
          if (sessionData.role) token.role = sessionData.role
          if (sessionData.avatar !== undefined) token.avatar = sessionData.avatar
          if (sessionData.name) token.name = sessionData.name
          if (sessionData.email) token.email = sessionData.email
          
          // Handle impersonation info
          if (sessionData.originalAdminId) {
            token.originalAdminId = sessionData.originalAdminId
            token.originalAdminName = sessionData.originalAdminName
            token.originalAdminEmail = sessionData.originalAdminEmail
          } else if (sessionData.originalAdminId === null) {
            // Clear impersonation info when returning to admin
            delete token.originalAdminId
            delete token.originalAdminName
            delete token.originalAdminEmail
          }
        } else {
          // Fallback: Update from database
          try {
            const User = (await import("@/models/User")).default
            const connectDB = (await import("@/lib/mongodb")).default
            await connectDB()
            const dbUser = await User.findById(token.id).select("avatar name email role").populate('role').lean()
            if (dbUser) {
              token.avatar = dbUser.avatar || null
              token.name = dbUser.name
              token.email = dbUser.email
              token.role = dbUser.role
            }
          } catch (error) {
            // Ignore errors - don't log in production
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && authConfig.callbacks.session.includeUser) {
        session.user.id = token.id as string
        if (authConfig.callbacks.session.includeRole) {
          session.user.role = token.role as any
        }
        session.user.avatar = (token.avatar as string) || null
        session.user.name = (token.name as string) || session.user.name
        session.user.email = (token.email as string) || session.user.email
        // Include impersonation info if present
        if (token.originalAdminId) {
          session.user.originalAdminId = token.originalAdminId as string
          session.user.originalAdminName = token.originalAdminName as string
          session.user.originalAdminEmail = token.originalAdminEmail as string
        }
      }
      return session
    }
  },
  pages: {
    signIn: routes.public.login,
    signOut: routes.public.login,
    error: routes.public.login,
    newUser: routes.public.register,
  },
  session: {
    strategy: authConfig.session.strategy,
    maxAge: authConfig.session.maxAge,
    updateAge: authConfig.session.updateAge,
  },
  secret: authConfig.secret,
}

