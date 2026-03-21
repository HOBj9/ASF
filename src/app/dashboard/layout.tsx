import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/permissions"
import { DashboardHeader } from "@/components/dashboard/header"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const user = session.user as any
  const userIsAdmin = isAdmin(user?.role ?? null)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-background via-background to-emerald-900/10">
      <DashboardHeader
        isAdmin={userIsAdmin}
        user={{
          name: user?.name ?? "",
          email: user?.email ?? "",
          avatar: user?.image ?? null,
          roleName: user?.role?.nameAr ?? null,
        }}
      />
      <main className="flex-1 overflow-y-auto bg-background/30 backdrop-blur-sm p-4 lg:p-8">
        {children}
      </main>
    </div>
  )
}

