import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Sidebar } from "@/components/dashboard/sidebar"
import { isAdmin } from "@/lib/permissions"
import { DashboardHeader } from "@/components/dashboard/header"
import { PageTransition } from "@/components/ui/page-transition"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const userIsAdmin = isAdmin(session.user.role as any)

  // Fetch user data including avatar and role
  await connectDB()
  const user = await User.findById(session.user.id).select("avatar name email role").populate('role', 'nameAr').lean()

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-background via-background to-purple/5 dark:to-purple/10">
      <Sidebar 
        isAdmin={userIsAdmin} 
        user={{
          name: user?.name || session.user.name || "",
          email: user?.email || session.user.email || "",
          avatar: user?.avatar || null,
          roleName: (user?.role as any)?.nameAr || null,
        }}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto bg-background/30 dark:bg-background/40 backdrop-blur-sm p-4 lg:p-8">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  )
}

