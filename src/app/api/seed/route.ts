import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import bcrypt from "bcryptjs"
// Import models to ensure they are registered
import "@/models"
import User from "@/models/User"
import Role from "@/models/Role"
import Permission from "@/models/Permission"
import { appConfig } from "@/lib/config/app.config"
import { defaultPermissions, defaultRoles } from "@/constants/permissions"
import { messages } from "@/constants/messages"
import { PermissionService } from "@/lib/services/permission.service"
import { RoleService } from "@/lib/services/role.service"
import { UserService } from "@/lib/services/user.service"

export async function POST() {
  try {
    // Check if seed endpoint is enabled
    if (!appConfig.features.seedEndpoint) {
      return NextResponse.json(
        { error: "Seed endpoint is disabled" },
        { status: 403 }
      )
    }

    await connectDB()

    // Clear existing data
    await User.deleteMany({})
    await Role.deleteMany({})
    await Permission.deleteMany({})

    // Create permissions using service
    const permissionService = new PermissionService()
    const permissions = await Promise.all(
      defaultPermissions.map(async (perm) => {
        try {
          return await permissionService.create(perm)
        } catch {
          // Permission might already exist, try to get it
          return await permissionService.getByName(perm.name) || null
        }
      })
    )
    const validPermissions = permissions.filter(Boolean)

    // Create roles using service
    const roleService = new RoleService()
    
    // Resolve permission IDs for admin role
    const manageAllPerm = validPermissions.find((p: any) => p.name === 'manage_all')
    const adminPerms = manageAllPerm 
      ? validPermissions.map((p: any) => p._id.toString())
      : validPermissions
          .filter((p: any) => defaultRoles.admin.permissions.includes(p.name))
          .map((p: any) => p._id.toString())

    const adminRole = await roleService.create({
      name: defaultRoles.admin.name,
      nameAr: defaultRoles.admin.nameAr,
      permissions: adminPerms,
    })

    // Resolve permission IDs for user role
    const userPermissionIds = validPermissions
      .filter((p: any) => defaultRoles.user.permissions.includes(p.name))
      .map((p: any) => p._id.toString())

    const userRole = await roleService.create({
      name: defaultRoles.user.name,
      nameAr: defaultRoles.user.nameAr,
      permissions: userPermissionIds,
    })

    // Create municipality admin role
    const municipalityRole = await roleService.create({
      name: defaultRoles.municipalityAdmin.name,
      nameAr: defaultRoles.municipalityAdmin.nameAr,
      permissions: userPermissionIds,
    })

    // Create users using service
    const userService = new UserService()
    
    const adminUser = await userService.create({
      name: appConfig.defaultAdmin.name,
      email: appConfig.defaultAdmin.email,
      password: appConfig.defaultAdmin.password,
      role: adminRole._id.toString(),
      isActive: true,
    })

    const regularUser = await userService.create({
      name: appConfig.defaultUser.name,
      email: appConfig.defaultUser.email,
      password: appConfig.defaultUser.password,
      role: userRole._id.toString(),
      isActive: true,
    })

    return NextResponse.json({
      message: messages.success.success,
      users: {
        admin: { 
          email: appConfig.defaultAdmin.email, 
          password: appConfig.defaultAdmin.password 
        },
        user: { 
          email: appConfig.defaultUser.email, 
          password: appConfig.defaultUser.password 
        },
        municipalityAdminRole: {
          name: municipalityRole.name,
        },
      },
    })
  } catch (error: any) {
    console.error("Seed error:", error)
    return NextResponse.json(
      { error: error.message || messages.errors.server },
      { status: 500 }
    )
  }
}

