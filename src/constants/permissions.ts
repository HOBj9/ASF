/**
 * Permission Definitions
 * Centralized permission resource and action definitions
 */

export const permissionResources = {
  ALL: 'all',
  DASHBOARD: 'dashboard',
  USERS: 'users',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  ORGANIZATIONS: 'organizations',
  BRANCHES: 'branches',
  VEHICLES: 'vehicles',
  DRIVERS: 'drivers',
  POINTS: 'points',
  ROUTES: 'routes',
  REPORTS: 'reports',
  EVENTS: 'events',
  MATERIALS: 'materials',
  MATERIAL_CATEGORIES: 'material_categories',
  UNITS: 'units',
  FORMS: 'forms',
  FORM_SUBMISSIONS: 'form_submissions',
} as const;

export const permissionActions = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage',
} as const;

export type PermissionResource = typeof permissionResources[keyof typeof permissionResources];
export type PermissionAction = typeof permissionActions[keyof typeof permissionActions];

export interface PermissionDefinition {
  name: string;
  nameAr: string;
  resource: PermissionResource;
  action: PermissionAction;
}

/**
 * Default Permissions
 * These are seeded into the database
 */
export const defaultPermissions: PermissionDefinition[] = [
  {
    name: 'manage_all',
    nameAr: 'إدارة الكل',
    resource: permissionResources.ALL,
    action: permissionActions.MANAGE,
  },
  { name: 'dashboard_read', nameAr: 'عرض لوحة التحكم التشغيلية', resource: permissionResources.DASHBOARD, action: permissionActions.READ },
  { name: 'users_create', nameAr: 'إنشاء المستخدمين', resource: permissionResources.USERS, action: permissionActions.CREATE },
  { name: 'users_read', nameAr: 'قراءة المستخدمين', resource: permissionResources.USERS, action: permissionActions.READ },
  { name: 'users_update', nameAr: 'تحديث المستخدمين', resource: permissionResources.USERS, action: permissionActions.UPDATE },
  { name: 'users_delete', nameAr: 'حذف المستخدمين', resource: permissionResources.USERS, action: permissionActions.DELETE },
  { name: 'roles_create', nameAr: 'إنشاء الأدوار', resource: permissionResources.ROLES, action: permissionActions.CREATE },
  { name: 'roles_read', nameAr: 'قراءة الأدوار', resource: permissionResources.ROLES, action: permissionActions.READ },
  { name: 'roles_update', nameAr: 'تحديث الأدوار', resource: permissionResources.ROLES, action: permissionActions.UPDATE },
  { name: 'roles_delete', nameAr: 'حذف الأدوار', resource: permissionResources.ROLES, action: permissionActions.DELETE },
  { name: 'permissions_create', nameAr: 'إنشاء الصلاحيات', resource: permissionResources.PERMISSIONS, action: permissionActions.CREATE },
  { name: 'permissions_read', nameAr: 'قراءة الصلاحيات', resource: permissionResources.PERMISSIONS, action: permissionActions.READ },
  { name: 'permissions_update', nameAr: 'تحديث الصلاحيات', resource: permissionResources.PERMISSIONS, action: permissionActions.UPDATE },
  { name: 'permissions_delete', nameAr: 'حذف الصلاحيات', resource: permissionResources.PERMISSIONS, action: permissionActions.DELETE },
  { name: 'organizations_read', nameAr: 'قراءة المؤسسات', resource: permissionResources.ORGANIZATIONS, action: permissionActions.READ },
  { name: 'organizations_create', nameAr: 'إنشاء المؤسسات', resource: permissionResources.ORGANIZATIONS, action: permissionActions.CREATE },
  { name: 'organizations_update', nameAr: 'تحديث المؤسسات', resource: permissionResources.ORGANIZATIONS, action: permissionActions.UPDATE },
  { name: 'organizations_delete', nameAr: 'حذف المؤسسات', resource: permissionResources.ORGANIZATIONS, action: permissionActions.DELETE },
  { name: 'branches_read', nameAr: 'قراءة الفروع', resource: permissionResources.BRANCHES, action: permissionActions.READ },
  { name: 'branches_create', nameAr: 'إنشاء الفروع', resource: permissionResources.BRANCHES, action: permissionActions.CREATE },
  { name: 'branches_update', nameAr: 'تحديث الفروع', resource: permissionResources.BRANCHES, action: permissionActions.UPDATE },
  { name: 'branches_delete', nameAr: 'حذف الفروع', resource: permissionResources.BRANCHES, action: permissionActions.DELETE },
  { name: 'vehicles_read', nameAr: 'قراءة المركبات', resource: permissionResources.VEHICLES, action: permissionActions.READ },
  { name: 'vehicles_create', nameAr: 'إنشاء المركبات', resource: permissionResources.VEHICLES, action: permissionActions.CREATE },
  { name: 'vehicles_update', nameAr: 'تحديث المركبات', resource: permissionResources.VEHICLES, action: permissionActions.UPDATE },
  { name: 'vehicles_delete', nameAr: 'حذف المركبات', resource: permissionResources.VEHICLES, action: permissionActions.DELETE },
  { name: 'drivers_read', nameAr: 'قراءة السائقين', resource: permissionResources.DRIVERS, action: permissionActions.READ },
  { name: 'drivers_create', nameAr: 'إنشاء السائقين', resource: permissionResources.DRIVERS, action: permissionActions.CREATE },
  { name: 'drivers_update', nameAr: 'تحديث السائقين', resource: permissionResources.DRIVERS, action: permissionActions.UPDATE },
  { name: 'drivers_delete', nameAr: 'حذف السائقين', resource: permissionResources.DRIVERS, action: permissionActions.DELETE },
  { name: 'points_read', nameAr: 'قراءة النقاط', resource: permissionResources.POINTS, action: permissionActions.READ },
  { name: 'points_create', nameAr: 'إنشاء النقاط', resource: permissionResources.POINTS, action: permissionActions.CREATE },
  { name: 'points_update', nameAr: 'تحديث النقاط', resource: permissionResources.POINTS, action: permissionActions.UPDATE },
  { name: 'points_delete', nameAr: 'حذف النقاط', resource: permissionResources.POINTS, action: permissionActions.DELETE },
  { name: 'routes_read', nameAr: 'قراءة المسارات', resource: permissionResources.ROUTES, action: permissionActions.READ },
  { name: 'routes_create', nameAr: 'إنشاء المسارات', resource: permissionResources.ROUTES, action: permissionActions.CREATE },
  { name: 'routes_update', nameAr: 'تحديث المسارات', resource: permissionResources.ROUTES, action: permissionActions.UPDATE },
  { name: 'routes_delete', nameAr: 'حذف المسارات', resource: permissionResources.ROUTES, action: permissionActions.DELETE },
  { name: 'reports_read', nameAr: 'قراءة التقارير', resource: permissionResources.REPORTS, action: permissionActions.READ },
  { name: 'events_read', nameAr: 'قراءة الأحداث', resource: permissionResources.EVENTS, action: permissionActions.READ },
  { name: 'materials_read', nameAr: 'قراءة المواد', resource: permissionResources.MATERIALS, action: permissionActions.READ },
  { name: 'materials_create', nameAr: 'إنشاء المواد', resource: permissionResources.MATERIALS, action: permissionActions.CREATE },
  { name: 'materials_update', nameAr: 'تحديث المواد', resource: permissionResources.MATERIALS, action: permissionActions.UPDATE },
  { name: 'materials_delete', nameAr: 'حذف المواد', resource: permissionResources.MATERIALS, action: permissionActions.DELETE },
  { name: 'material_categories_read', nameAr: 'قراءة تصنيفات المواد', resource: permissionResources.MATERIAL_CATEGORIES, action: permissionActions.READ },
  { name: 'material_categories_create', nameAr: 'إنشاء تصنيفات المواد', resource: permissionResources.MATERIAL_CATEGORIES, action: permissionActions.CREATE },
  { name: 'material_categories_update', nameAr: 'تحديث تصنيفات المواد', resource: permissionResources.MATERIAL_CATEGORIES, action: permissionActions.UPDATE },
  { name: 'material_categories_delete', nameAr: 'حذف تصنيفات المواد', resource: permissionResources.MATERIAL_CATEGORIES, action: permissionActions.DELETE },
  { name: 'units_read', nameAr: 'قراءة وحدات القياس', resource: permissionResources.UNITS, action: permissionActions.READ },
  { name: 'units_create', nameAr: 'إنشاء وحدات القياس', resource: permissionResources.UNITS, action: permissionActions.CREATE },
  { name: 'units_update', nameAr: 'تحديث وحدات القياس', resource: permissionResources.UNITS, action: permissionActions.UPDATE },
  { name: 'units_delete', nameAr: 'حذف وحدات القياس', resource: permissionResources.UNITS, action: permissionActions.DELETE },
  { name: 'forms_read', nameAr: 'قراءة الاستبيانات', resource: permissionResources.FORMS, action: permissionActions.READ },
  { name: 'forms_create', nameAr: 'إنشاء الاستبيانات', resource: permissionResources.FORMS, action: permissionActions.CREATE },
  { name: 'forms_update', nameAr: 'تحديث الاستبيانات', resource: permissionResources.FORMS, action: permissionActions.UPDATE },
  { name: 'forms_delete', nameAr: 'حذف الاستبيانات', resource: permissionResources.FORMS, action: permissionActions.DELETE },
  { name: 'form_submissions_read', nameAr: 'قراءة إرسالات الاستبيان', resource: permissionResources.FORM_SUBMISSIONS, action: permissionActions.READ },
  { name: 'form_submissions_create', nameAr: 'إرسال الاستبيان', resource: permissionResources.FORM_SUBMISSIONS, action: permissionActions.CREATE },
];

/**
 * Default Roles
 * - super_admin: كل الصلاحيات (manage_all)
 * - organization_admin: المؤسسة والفروع والمستخدمون + الاستبيانات + نقاط المؤسسة + المواد والوحدات (بدون إدارة أدوار النظام)
 * - line_supervisor: قراءة الاستبيانات + إرسال الاستبيان + قراءة النقاط (للمؤسسة)
 * - branch_admin: إدارة الفرع (مركبات، سائقون، نقاط، مسارات، تقارير، مواد، وحدات)
 * - branch_user: قراءة فقط (مركبات، سائقون، نقاط، مسارات، تقارير، مواد، وحدات)
 */
export const defaultRoles = {
  superAdmin: {
    name: 'super_admin',
    nameAr: 'مدير النظام العام',
    permissions: ['manage_all'],
  },
  organizationAdmin: {
    name: 'organization_admin',
    nameAr: 'مدير مؤسسة',
    permissions: [
      'dashboard_read',
      'organizations_read',
      'organizations_update',
      'branches_read',
      'branches_create',
      'branches_update',
      'branches_delete',
      'users_read',
      'users_create',
      'users_update',
      'users_delete',
      'roles_read',
      'permissions_read',
      'vehicles_read',
      'drivers_read',
      'points_read',
      'routes_read',
      'reports_read',
      'events_read',
      'materials_read',
      'materials_create',
      'materials_update',
      'materials_delete',
      'material_categories_read',
      'material_categories_create',
      'material_categories_update',
      'material_categories_delete',
      'units_read',
      'units_create',
      'units_update',
      'units_delete',
      'forms_read',
      'forms_create',
      'forms_update',
      'forms_delete',
      'form_submissions_read',
      'points_create',
      'points_update',
      'points_delete',
    ],
  },
  lineSupervisor: {
    name: 'line_supervisor',
    nameAr: 'مشرف الخط',
    permissions: [
      'forms_read',
      'form_submissions_read',
      'form_submissions_create',
    ],
  },
  branchAdmin: {
    name: 'branch_admin',
    nameAr: 'مدير فرع',
    permissions: [
      'dashboard_read',
      'vehicles_read',
      'vehicles_create',
      'vehicles_update',
      'vehicles_delete',
      'drivers_read',
      'drivers_create',
      'drivers_update',
      'drivers_delete',
      'points_read',
      'points_create',
      'points_update',
      'points_delete',
      'routes_read',
      'routes_create',
      'routes_update',
      'routes_delete',
      'reports_read',
      'events_read',
      'materials_read',
      'materials_create',
      'materials_update',
      'materials_delete',
      'material_categories_read',
      'material_categories_create',
      'material_categories_update',
      'material_categories_delete',
      'units_read',
      'units_create',
      'units_update',
      'units_delete',
    ],
  },
  branchUser: {
    name: 'branch_user',
    nameAr: 'مستخدم فرع',
    permissions: [
      'dashboard_read',
      'vehicles_read',
      'drivers_read',
      'points_read',
      'routes_read',
      'reports_read',
      'events_read',
      'materials_read',
      'material_categories_read',
      'units_read',
    ],
  },
} as const;

