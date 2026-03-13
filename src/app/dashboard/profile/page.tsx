import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ProfileManager } from "@/components/profile/profile-manager"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  // Fetch fresh user data from database to ensure we have the latest avatar
  await connectDB()
  const user = await User.findById(session.user.id)
    .select("name email avatar businessName")
    .lean()

  return (
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">الملف الشخصي</h1>
        <p className="text-muted-foreground mt-2">إدارة معلومات حسابك الشخصي</p>
      </div>

      <ProfileManager 
        initialUser={{
          id: session.user.id,
          name: user?.name || session.user.name || "",
          email: user?.email || session.user.email || "",
          avatar: user?.avatar || undefined,
          businessName: (user as any)?.businessName || undefined,
        }} 
      />
    </div>
  )
}

