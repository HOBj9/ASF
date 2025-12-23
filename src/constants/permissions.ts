/**
 * Permission Definitions
 * Centralized permission resource and action definitions
 */

export const permissionResources = {
  ALL: 'all',
  USERS: 'users',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
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
  {
    name: 'users_create',
    nameAr: 'إنشاء مستخدمين',
    resource: permissionResources.USERS,
    action: permissionActions.CREATE,
  },
  {
    name: 'users_read',
    nameAr: 'قراءة المستخدمين',
    resource: permissionResources.USERS,
    action: permissionActions.READ,
  },
  {
    name: 'users_update',
    nameAr: 'تحديث المستخدمين',
    resource: permissionResources.USERS,
    action: permissionActions.UPDATE,
  },
  {
    name: 'users_delete',
    nameAr: 'حذف المستخدمين',
    resource: permissionResources.USERS,
    action: permissionActions.DELETE,
  },
  {
    name: 'roles_create',
    nameAr: 'إنشاء أدوار',
    resource: permissionResources.ROLES,
    action: permissionActions.CREATE,
  },
  {
    name: 'roles_read',
    nameAr: 'قراءة الأدوار',
    resource: permissionResources.ROLES,
    action: permissionActions.READ,
  },
  {
    name: 'roles_update',
    nameAr: 'تحديث الأدوار',
    resource: permissionResources.ROLES,
    action: permissionActions.UPDATE,
  },
  {
    name: 'roles_delete',
    nameAr: 'حذف الأدوار',
    resource: permissionResources.ROLES,
    action: permissionActions.DELETE,
  },
  {
    name: 'permissions_create',
    nameAr: 'إنشاء صلاحيات',
    resource: permissionResources.PERMISSIONS,
    action: permissionActions.CREATE,
  },
  {
    name: 'permissions_read',
    nameAr: 'قراءة الصلاحيات',
    resource: permissionResources.PERMISSIONS,
    action: permissionActions.READ,
  },
  {
    name: 'permissions_update',
    nameAr: 'تحديث الصلاحيات',
    resource: permissionResources.PERMISSIONS,
    action: permissionActions.UPDATE,
  },
  {
    name: 'permissions_delete',
    nameAr: 'حذف الصلاحيات',
    resource: permissionResources.PERMISSIONS,
    action: permissionActions.DELETE,
  },
];

/**
 * Default Roles
 */
export const defaultRoles = {
  admin: {
    name: 'admin',
    nameAr: 'مدير',
    permissions: ['manage_all'], // Will be resolved to actual permission IDs
  },
  user: {
    name: 'user',
    nameAr: 'مستخدم',
    permissions: ['users_read'], // Will be resolved to actual permission IDs
  },
} as const;

