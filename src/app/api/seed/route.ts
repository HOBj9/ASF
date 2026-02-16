import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
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
    if (!appConfig.features.seedEndpoint) {
      return NextResponse.json(
        { error: "Seed endpoint is disabled" },
        { status: 403 }
      )
    }

    await connectDB()

    await User.deleteMany({})
    await Role.deleteMany({})
    await Permission.deleteMany({})

    const permissionService = new PermissionService()
    const permissions = await Promise.all(
      defaultPermissions.map(async (perm) => {
        try {
          return await permissionService.create(perm)
        } catch {
          return await permissionService.getByName(perm.name) || null
        }
      })
    )
    const validPermissions = permissions.filter(Boolean)

    const roleService = new RoleService()
    const userService = new UserService()

    const manageAllPerm = validPermissions.find((p: any) => p.name === "manage_all")
    const superPerms = manageAllPerm
      ? validPermissions.map((p: any) => p._id.toString())
      : []

    const superRole = await roleService.create({
      name: defaultRoles.superAdmin.name,
      nameAr: defaultRoles.superAdmin.nameAr,
      permissions: superPerms,
    })

    const orgPerms = validPermissions
      .filter((p: any) => defaultRoles.organizationAdmin.permissions.includes(p.name))
      .map((p: any) => p._id.toString())

    const orgRole = await roleService.create({
      name: defaultRoles.organizationAdmin.name,
      nameAr: defaultRoles.organizationAdmin.nameAr,
      permissions: orgPerms,
    })

    const branchPerms = validPermissions
      .filter((p: any) => defaultRoles.branchAdmin.permissions.includes(p.name))
      .map((p: any) => p._id.toString())

    const branchRole = await roleService.create({
      name: defaultRoles.branchAdmin.name,
      nameAr: defaultRoles.branchAdmin.nameAr,
      permissions: branchPerms,
    })

    const branchUserPerms = validPermissions
      .filter((p: any) => defaultRoles.branchUser.permissions.includes(p.name))
      .map((p: any) => p._id.toString())

    const branchUserRole = await roleService.create({
      name: defaultRoles.branchUser.name,
      nameAr: defaultRoles.branchUser.nameAr,
      permissions: branchUserPerms,
    })

    const lineSupervisorPerms = validPermissions
      .filter((p: any) => defaultRoles.lineSupervisor.permissions.includes(p.name))
      .map((p: any) => p._id.toString())

    await roleService.create({
      name: defaultRoles.lineSupervisor.name,
      nameAr: defaultRoles.lineSupervisor.nameAr,
      permissions: lineSupervisorPerms,
    })

    await userService.create({
      name: appConfig.defaultAdmin.name,
      email: appConfig.defaultAdmin.email,
      password: appConfig.defaultAdmin.password,
      role: superRole._id.toString(),
      isActive: true,
    })

    await userService.create({
      name: appConfig.defaultUser.name,
      email: appConfig.defaultUser.email,
      password: appConfig.defaultUser.password,
      role: branchUserRole._id.toString(),
      isActive: true,
    })

    return NextResponse.json({
      message: messages.success.success,
      users: {
        superAdmin: {
          email: appConfig.defaultAdmin.email,
          password: appConfig.defaultAdmin.password,
        },
        branchUser: {
          email: appConfig.defaultUser.email,
          password: appConfig.defaultUser.password,
        },
      },
      roles: {
        organization: orgRole.name,
        branchAdmin: branchRole.name,
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
