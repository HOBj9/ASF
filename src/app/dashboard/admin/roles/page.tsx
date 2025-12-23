import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/permissions"
import { RolesManagement } from "@/components/admin/roles-management"
import connectDB from "@/lib/mongodb"
import Role from "@/models/Role"
import Permission from "@/models/Permission"
import { RoleService } from "@/lib/services/role.service"
import { PermissionService } from "@/lib/services/permission.service"

export default async function RolesPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const userIsAdmin = isAdmin(session.user.role as any)

  if (!userIsAdmin) {
    redirect("/unauthorized")
  }

  // Fetch roles and permissions from server
  let initialRoles: any[] = []
  let initialPermissions: any[] = []

  try {
    await connectDB()
    const roleService = new RoleService()
    const permissionService = new PermissionService()
    
    initialRoles = await roleService.getAll()
    initialPermissions = await permissionService.getAll()
  } catch (error) {
    console.error("Error fetching roles and permissions:", error)
    // Continue with empty arrays - client will try to fetch
  }

  return (
    <div className="text-right">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">إدارة الأدوار</h1>
        <p className="text-muted-foreground mt-2">عرض وإدارة الأدوار والصلاحيات في النظام</p>
      </div>

      <RolesManagement 
        initialRoles={JSON.parse(JSON.stringify(initialRoles))} 
        initialPermissions={JSON.parse(JSON.stringify(initialPermissions))} 
      />
    </div>
  )
}

