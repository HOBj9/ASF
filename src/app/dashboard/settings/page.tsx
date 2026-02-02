import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import { ProfileManager } from "@/components/profile/profile-manager"
import { OrganizationLabelsSettings } from "@/components/settings/organization-labels-settings"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  await connectDB()
  const user = await User.findById(session.user.id)
    .select("name email avatar businessName")
    .lean()

  return (
    <div className="text-right space-y-8">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground mt-2">إدارة الملف الشخصي وتسميات المؤسسة</p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">الملف الشخصي</h2>
        <ProfileManager
          initialUser={{
            id: session.user.id,
            name: user?.name || session.user.name || "",
            email: user?.email || session.user.email || "",
            avatar: user?.avatar || null,
            businessName: (user as any)?.businessName || null,
          }}
        />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">تسميات المؤسسة</h2>
        <OrganizationLabelsSettings />
      </div>
    </div>
  )
}

