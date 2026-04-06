/**
 * Sync Permissions Script
 *
 * يقارن الصلاحيات المعرّفة في constants/permissions.ts مع الصلاحيات في قاعدة البيانات،
 * ويضيف أي صلاحيات جديدة غير مزامنة، ويحدّث الأدوار لتشمل الصلاحيات الجديدة.
 *
 * استخدم هذا السكربت عند إضافة صلاحيات جديدة إلى defaultPermissions أو تحديث defaultRoles.
 *
 * التشغيل:
 *   npm run sync:permissions
 *   أو داخل Docker (prod): docker compose -f docker-compose.prod.yml --profile tools run --rm tools npm run sync:permissions
 */

import connectDB from "@/lib/mongodb";
import Permission from "@/models/Permission";
import Role from "@/models/Role";
import { defaultPermissions, defaultRoles } from "@/constants/permissions";

async function syncPermissions() {
  console.log("[sync-permissions] بدء مزامنة الصلاحيات...");

  await connectDB();

  const existingPerms = await Permission.find({}).lean();
  const existingByName = new Map(existingPerms.map((p: any) => [p.name, p]));

  const toAdd: typeof defaultPermissions = [];
  for (const def of defaultPermissions) {
    if (!existingByName.has(def.name)) {
      toAdd.push(def);
    }
  }

  if (toAdd.length > 0) {
    console.log(`[sync-permissions] إضافة ${toAdd.length} صلاحية جديدة:`);
    for (const p of toAdd) {
      console.log(`  - ${p.name} (${p.nameAr})`);
    }
    await Permission.insertMany(
      toAdd.map((p) => ({
        name: p.name,
        nameAr: p.nameAr,
        resource: p.resource,
        action: p.action,
      }))
    );
  } else {
    console.log("[sync-permissions] جميع الصلاحيات مزامنة بالفعل.");
  }

  const allPerms = await Permission.find({}).lean();
  const permMap = new Map(allPerms.map((p: any) => [p.name, p._id.toString()]));

  const allPermNames = defaultPermissions.map((p) => p.name);
  const roleSpecs: Array<{ name: string; permissions: string[] }> = [
    { name: defaultRoles.superAdmin.name, permissions: allPermNames },
    { name: defaultRoles.organizationAdmin.name, permissions: [...defaultRoles.organizationAdmin.permissions] },
    { name: defaultRoles.branchAdmin.name, permissions: [...defaultRoles.branchAdmin.permissions] },
    { name: defaultRoles.branchUser.name, permissions: [...defaultRoles.branchUser.permissions] },
    { name: defaultRoles.lineSupervisor.name, permissions: [...defaultRoles.lineSupervisor.permissions] },
  ];

  for (const spec of roleSpecs) {
    const role = await Role.findOne({ name: spec.name }).exec();
    if (!role) {
      console.log(`[sync-permissions] تحذير: الدور "${spec.name}" غير موجود، تخطي.`);
      continue;
    }

    const expectedIds = spec.permissions
      .map((name) => permMap.get(name))
      .filter(Boolean) as string[];
    const currentIds = (role.permissions || []).map((id: any) => id.toString());
    const missingIds = expectedIds.filter((id) => !currentIds.includes(id));

    if (missingIds.length > 0) {
      const newPermIds = [...new Set([...currentIds, ...missingIds])];
      await Role.findByIdAndUpdate(role._id, { permissions: newPermIds });
      console.log(`[sync-permissions] تحديث الدور "${spec.name}": إضافة ${missingIds.length} صلاحية.`);
    }
  }

  console.log("[sync-permissions] اكتملت المزامنة بنجاح.");
}

syncPermissions()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[sync-permissions] خطأ:", err);
    process.exit(1);
  });
