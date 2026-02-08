import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard/header"
import { PageTransition } from "@/components/ui/page-transition"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-background via-background to-emerald-900/10">
      <DashboardHeader />
      <main className="flex-1 overflow-y-auto bg-background/30 backdrop-blur-sm p-4 lg:p-8">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    </div>
  )
}

