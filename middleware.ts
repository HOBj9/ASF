import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { routes } from "@/constants/routes";
import { isAdmin } from "@/lib/permissions";

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (
      token?.id &&
      token.isActive === false &&
      path !== routes.public.login &&
      path !== routes.public.register &&
      path !== routes.public.home
    ) {
      return NextResponse.redirect(
        new URL(`${routes.public.login}?error=account_disabled`, req.url),
      );
    }

    if (
      path.startsWith('/admin') ||
      path.startsWith(routes.admin.users) ||
      path.startsWith(routes.admin.roles) ||
      path.startsWith(routes.admin.permissions)
    ) {
      if (!token?.role) {
        return NextResponse.redirect(new URL(routes.public.login, req.url));
      }

      if (!isAdmin(token.role as any)) {
        return NextResponse.redirect(new URL(routes.protected.unauthorized, req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        if (
          path === routes.public.login ||
          path === routes.public.register ||
          path === routes.public.home ||
          path === routes.public.apiDocs
        ) {
          return true;
        }

        return !!token;
      },
    },
  },
);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
