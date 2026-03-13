import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authConfig } from "@/lib/config/auth.config";
import { messages } from "@/constants/messages";
import { routes } from "@/constants/routes";
import { AuthService } from "@/lib/services/auth.service";

const authService = new AuthService();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: authConfig.providers.credentials.name,
      credentials: {
        email: { label: messages.auth.login.email, type: "email" },
        password: { label: messages.auth.login.password, type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error(messages.auth.login.required);
        }

        try {
          const user = await authService.validateCredentials(
            credentials.email,
            credentials.password,
          );

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role as any,
            avatar: user.avatar || null,
            organizationId: (user as any).organizationId || null,
            branchId: (user as any).branchId || null,
            isActive: user.isActive,
          };
        } catch (error: any) {
          throw new Error(error.message || messages.auth.login.error);
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user && authConfig.callbacks.jwt.includeRole) {
        token.id = user.id;
        token.role = (user as any).role;
        token.avatar = (user as any).avatar || null;
        token.name = (user as any).name;
        token.email = (user as any).email;
        token.branchId = (user as any).branchId || null;
        token.organizationId = (user as any).organizationId || null;
        token.isActive = (user as any).isActive ?? true;

        if ((user as any).originalAdminId) {
          token.originalAdminId = (user as any).originalAdminId;
          token.originalAdminName = (user as any).originalAdminName;
          token.originalAdminEmail = (user as any).originalAdminEmail;
        }
      }

      if (trigger === "update" && session) {
        const sessionData = session as any;

        if (sessionData.id || sessionData.name || sessionData.email || sessionData.role) {
          if (sessionData.id) token.id = sessionData.id;
          if (sessionData.role) token.role = sessionData.role;
          if (sessionData.avatar !== undefined) token.avatar = sessionData.avatar;
          if (sessionData.name) token.name = sessionData.name;
          if (sessionData.email) token.email = sessionData.email;
          if (sessionData.branchId !== undefined) token.branchId = sessionData.branchId;
          if (sessionData.organizationId !== undefined) token.organizationId = sessionData.organizationId;
          if (sessionData.isActive !== undefined) token.isActive = sessionData.isActive;

          if (sessionData.originalAdminId) {
            token.originalAdminId = sessionData.originalAdminId;
            token.originalAdminName = sessionData.originalAdminName;
            token.originalAdminEmail = sessionData.originalAdminEmail;
          } else if (sessionData.originalAdminId === null) {
            delete token.originalAdminId;
            delete token.originalAdminName;
            delete token.originalAdminEmail;
          }
        } else {
          try {
            const User = (await import("@/models/User")).default;
            const connectDB = (await import("@/lib/mongodb")).default;
            await connectDB();
            const dbUser = await User.findById(token.id)
              .select("avatar name email role branchId organizationId isActive")
              .populate({ path: "role", populate: { path: "permissions" } })
              .lean();

            if (dbUser) {
              token.avatar = dbUser.avatar || null;
              token.name = dbUser.name;
              token.email = dbUser.email;
              token.role = dbUser.role;
              token.branchId = (dbUser as any).branchId || null;
              token.organizationId = (dbUser as any).organizationId || null;
              token.isActive = (dbUser as any).isActive ?? true;
            }
          } catch {
            // Ignore refresh errors and keep the current token.
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && authConfig.callbacks.session.includeUser) {
        session.user.id = token.id as string;
        if (authConfig.callbacks.session.includeRole) {
          session.user.role = token.role as any;
        }
        session.user.avatar = (token.avatar as string) || null;
        session.user.name = (token.name as string) || session.user.name;
        session.user.email = (token.email as string) || session.user.email;
        session.user.branchId = (token.branchId as string) || null;
        session.user.organizationId = (token.organizationId as string) || null;
        session.user.isActive = token.isActive !== false;

        if (token.originalAdminId) {
          session.user.originalAdminId = token.originalAdminId as string;
          session.user.originalAdminName = token.originalAdminName as string;
          session.user.originalAdminEmail = token.originalAdminEmail as string;
        }
      }

      return session;
    },
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
};
