import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/permissions"
import connectDB from "@/lib/mongodb"
import WelcomeGreeting from "@/models/WelcomeGreeting"
import dynamic from "next/dynamic"
import { Loading } from "@/components/ui/loading"

const WelcomeGreetingsManagement = dynamic(
  () => import("@/components/admin/welcome-greetings-management").then(mod => ({ default: mod.WelcomeGreetingsManagement })),
  {
    loading: () => <Loading />,
    ssr: false,
  }
)

export default async function WelcomeGreetingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const userIsAdmin = isAdmin(session.user.role as any)

  if (!userIsAdmin) {
    redirect("/unauthorized")
  }

  await connectDB()
  const greetings = await WelcomeGreeting.find({}).sort({ order: 1, createdAt: -1 }).lean()

  return (
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">إدارة العبارات الترحيبية</h1>
        <p className="text-muted-foreground mt-2">إدارة العبارات الترحيبية التي تُرسل قبل رسائل التحقق</p>
      </div>

      <WelcomeGreetingsManagement initialGreetings={JSON.parse(JSON.stringify(greetings))} />
    </div>
  )
}

