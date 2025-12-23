import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Role from "@/models/Role"
import Permission from "@/models/Permission"
import bcrypt from "bcryptjs"

async function seed() {
  try {
    await connectDB()
    console.log("Connected to MongoDB")

    // Clear existing data (optional - comment out if you want to keep existing data)
    await User.deleteMany({})
    await Role.deleteMany({})
    await Permission.deleteMany({})
    console.log("Cleared existing data")

    // Create permissions
    const permissions = await Permission.insertMany([
      {
        name: "manage_all",
        nameAr: "إدارة الكل",
        resource: "all",
        action: "manage",
      },
      {
        name: "users_create",
        nameAr: "إنشاء مستخدمين",
        resource: "users",
        action: "create",
      },
      {
        name: "users_read",
        nameAr: "قراءة المستخدمين",
        resource: "users",
        action: "read",
      },
      {
        name: "users_update",
        nameAr: "تحديث المستخدمين",
        resource: "users",
        action: "update",
      },
      {
        name: "users_delete",
        nameAr: "حذف المستخدمين",
        resource: "users",
        action: "delete",
      },
      {
        name: "roles_create",
        nameAr: "إنشاء أدوار",
        resource: "roles",
        action: "create",
      },
      {
        name: "roles_read",
        nameAr: "قراءة الأدوار",
        resource: "roles",
        action: "read",
      },
      {
        name: "roles_update",
        nameAr: "تحديث الأدوار",
        resource: "roles",
        action: "update",
      },
      {
        name: "roles_delete",
        nameAr: "حذف الأدوار",
        resource: "roles",
        action: "delete",
      },
      {
        name: "permissions_create",
        nameAr: "إنشاء صلاحيات",
        resource: "permissions",
        action: "create",
      },
      {
        name: "permissions_read",
        nameAr: "قراءة الصلاحيات",
        resource: "permissions",
        action: "read",
      },
      {
        name: "permissions_update",
        nameAr: "تحديث الصلاحيات",
        resource: "permissions",
        action: "update",
      },
      {
        name: "permissions_delete",
        nameAr: "حذف الصلاحيات",
        resource: "permissions",
        action: "delete",
      },
    ])

    console.log("Created permissions")

    // Create admin role
    const adminRole = await Role.create({
      name: "admin",
      nameAr: "مدير",
      permissions: permissions.map((p: any) => p._id),
    })

    console.log("Created admin role")

    // Create user role
    const userRole = await Role.create({
      name: "user",
      nameAr: "مستخدم",
      permissions: [permissions.find((p: any) => p.name === "users_read")!._id],
    })

    console.log("Created user role")

    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 10)
    const adminUser = await User.create({
      name: "مدير النظام",
      email: "admin@example.com",
      password: hashedPassword,
      role: adminRole._id,
      isActive: true,
    })

    console.log("Created admin user:")
    console.log("Email: admin@example.com")
    console.log("Password: admin123")

    // Create regular user
    const userPassword = await bcrypt.hash("user123", 10)
    const regularUser = await User.create({
      name: "مستخدم عادي",
      email: "user@example.com",
      password: userPassword,
      role: userRole._id,
      isActive: true,
    })

    console.log("Created regular user:")
    console.log("Email: user@example.com")
    console.log("Password: user123")

    console.log("Seed completed successfully!")
    process.exit(0)
  } catch (error) {
    console.error("Seed error:", error)
    process.exit(1)
  }
}

seed()

