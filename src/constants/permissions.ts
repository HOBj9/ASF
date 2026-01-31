/**
 * Permission Definitions
 * Centralized permission resource and action definitions
 */

export const permissionResources = {
  ALL: 'all',
  USERS: 'users',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  MUNICIPALITIES: 'municipalities',
  VEHICLES: 'vehicles',
  DRIVERS: 'drivers',
  POINTS: 'points',
  ROUTES: 'routes',
  REPORTS: 'reports',
  EVENTS: 'events',
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
    nameAr: 'ط¥ط¯ط§ط±ط© ط§ظ„ظƒظ„',
    resource: permissionResources.ALL,
    action: permissionActions.MANAGE,
  },
  {
    name: 'users_create',
    nameAr: 'ط¥ظ†ط´ط§ط، ظ…ط³طھط®ط¯ظ…ظٹظ†',
    resource: permissionResources.USERS,
    action: permissionActions.CREATE,
  },
  {
    name: 'users_read',
    nameAr: 'ظ‚ط±ط§ط،ط© ط§ظ„ظ…ط³طھط®ط¯ظ…ظٹظ†',
    resource: permissionResources.USERS,
    action: permissionActions.READ,
  },
  {
    name: 'users_update',
    nameAr: 'طھط­ط¯ظٹط« ط§ظ„ظ…ط³طھط®ط¯ظ…ظٹظ†',
    resource: permissionResources.USERS,
    action: permissionActions.UPDATE,
  },
  {
    name: 'users_delete',
    nameAr: 'ط­ط°ظپ ط§ظ„ظ…ط³طھط®ط¯ظ…ظٹظ†',
    resource: permissionResources.USERS,
    action: permissionActions.DELETE,
  },
  {
    name: 'roles_create',
    nameAr: 'ط¥ظ†ط´ط§ط، ط£ط¯ظˆط§ط±',
    resource: permissionResources.ROLES,
    action: permissionActions.CREATE,
  },
  {
    name: 'roles_read',
    nameAr: 'ظ‚ط±ط§ط،ط© ط§ظ„ط£ط¯ظˆط§ط±',
    resource: permissionResources.ROLES,
    action: permissionActions.READ,
  },
  {
    name: 'roles_update',
    nameAr: 'طھط­ط¯ظٹط« ط§ظ„ط£ط¯ظˆط§ط±',
    resource: permissionResources.ROLES,
    action: permissionActions.UPDATE,
  },
  {
    name: 'roles_delete',
    nameAr: 'ط­ط°ظپ ط§ظ„ط£ط¯ظˆط§ط±',
    resource: permissionResources.ROLES,
    action: permissionActions.DELETE,
  },
  {
    name: 'permissions_create',
    nameAr: 'ط¥ظ†ط´ط§ط، طµظ„ط§ط­ظٹط§طھ',
    resource: permissionResources.PERMISSIONS,
    action: permissionActions.CREATE,
  },
  {
    name: 'permissions_read',
    nameAr: 'ظ‚ط±ط§ط،ط© ط§ظ„طµظ„ط§ط­ظٹط§طھ',
    resource: permissionResources.PERMISSIONS,
    action: permissionActions.READ,
  },
  {
    name: 'permissions_update',
    nameAr: 'طھط­ط¯ظٹط« ط§ظ„طµظ„ط§ط­ظٹط§طھ',
    resource: permissionResources.PERMISSIONS,
    action: permissionActions.UPDATE,
  },
  {
    name: 'permissions_delete',
    nameAr: 'ط­ط°ظپ ط§ظ„طµظ„ط§ط­ظٹط§طھ',
    resource: permissionResources.PERMISSIONS,
    action: permissionActions.DELETE,
  },
  {
    name: 'municipalities_read',
    nameAr: 'ظ‚ط±ط§ط،ط© ط§ظ„ط¨ظ„ط¯ظٹط§طھ',
    resource: permissionResources.MUNICIPALITIES,
    action: permissionActions.READ,
  },
  {
    name: 'municipalities_create',
    nameAr: 'ط¥ظ†ط´ط§ط، ط§ظ„ط¨ظ„ط¯ظٹط§طھ',
    resource: permissionResources.MUNICIPALITIES,
    action: permissionActions.CREATE,
  },
  {
    name: 'municipalities_update',
    nameAr: 'طھط­ط¯ظٹط« ط§ظ„ط¨ظ„ط¯ظٹط§طھ',
    resource: permissionResources.MUNICIPALITIES,
    action: permissionActions.UPDATE,
  },
  {
    name: 'municipalities_delete',
    nameAr: 'ط­ط°ظپ ط§ظ„ط¨ظ„ط¯ظٹط§طھ',
    resource: permissionResources.MUNICIPALITIES,
    action: permissionActions.DELETE,
  },
  {
    name: 'vehicles_read',
    nameAr: 'ظ‚ط±ط§ط،ط© ط§ظ„ظ…ط±ظƒط¨ط§طھ',
    resource: permissionResources.VEHICLES,
    action: permissionActions.READ,
  },
  {
    name: 'vehicles_create',
    nameAr: 'ط¥ظ†ط´ط§ط، ط§ظ„ظ…ط±ظƒط¨ط§طھ',
    resource: permissionResources.VEHICLES,
    action: permissionActions.CREATE,
  },
  {
    name: 'vehicles_update',
    nameAr: 'طھط­ط¯ظٹط« ط§ظ„ظ…ط±ظƒط¨ط§طھ',
    resource: permissionResources.VEHICLES,
    action: permissionActions.UPDATE,
  },
  {
    name: 'vehicles_delete',
    nameAr: 'ط­ط°ظپ ط§ظ„ظ…ط±ظƒط¨ط§طھ',
    resource: permissionResources.VEHICLES,
    action: permissionActions.DELETE,
  },
  {
    name: 'drivers_read',
    nameAr: 'ظ‚ط±ط§ط،ط© ط§ظ„ط³ط§ط¦ظ‚ظٹظ†',
    resource: permissionResources.DRIVERS,
    action: permissionActions.READ,
  },
  {
    name: 'drivers_create',
    nameAr: 'ط¥ظ†ط´ط§ط، ط§ظ„ط³ط§ط¦ظ‚ظٹظ†',
    resource: permissionResources.DRIVERS,
    action: permissionActions.CREATE,
  },
  {
    name: 'drivers_update',
    nameAr: 'طھط­ط¯ظٹط« ط§ظ„ط³ط§ط¦ظ‚ظٹظ†',
    resource: permissionResources.DRIVERS,
    action: permissionActions.UPDATE,
  },
  {
    name: 'drivers_delete',
    nameAr: 'ط­ط°ظپ ط§ظ„ط³ط§ط¦ظ‚ظٹظ†',
    resource: permissionResources.DRIVERS,
    action: permissionActions.DELETE,
  },
  {
    name: 'points_read',
    nameAr: 'ظ‚ط±ط§ط،ط© ط§ظ„ظ†ظ‚ط§ط·',
    resource: permissionResources.POINTS,
    action: permissionActions.READ,
  },
  {
    name: 'points_create',
    nameAr: 'ط¥ظ†ط´ط§ط، ط§ظ„ظ†ظ‚ط§ط·',
    resource: permissionResources.POINTS,
    action: permissionActions.CREATE,
  },
  {
    name: 'points_update',
    nameAr: 'طھط­ط¯ظٹط« ط§ظ„ظ†ظ‚ط§ط·',
    resource: permissionResources.POINTS,
    action: permissionActions.UPDATE,
  },
  {
    name: 'points_delete',
    nameAr: 'ط­ط°ظپ ط§ظ„ظ†ظ‚ط§ط·',
    resource: permissionResources.POINTS,
    action: permissionActions.DELETE,
  },
  {
    name: 'routes_read',
    nameAr: 'ظ‚ط±ط§ط،ط© ط§ظ„ظ…ط³ط§ط±ط§طھ',
    resource: permissionResources.ROUTES,
    action: permissionActions.READ,
  },
  {
    name: 'routes_create',
    nameAr: 'ط¥ظ†ط´ط§ط، ط§ظ„ظ…ط³ط§ط±ط§طھ',
    resource: permissionResources.ROUTES,
    action: permissionActions.CREATE,
  },
  {
    name: 'routes_update',
    nameAr: 'طھط­ط¯ظٹط« ط§ظ„ظ…ط³ط§ط±ط§طھ',
    resource: permissionResources.ROUTES,
    action: permissionActions.UPDATE,
  },
  {
    name: 'routes_delete',
    nameAr: 'ط­ط°ظپ ط§ظ„ظ…ط³ط§ط±ط§طھ',
    resource: permissionResources.ROUTES,
    action: permissionActions.DELETE,
  },
  {
    name: 'reports_read',
    nameAr: 'ظ‚ط±ط§ط،ط© ط§ظ„طھظ‚ط§ط±ظٹط±',
    resource: permissionResources.REPORTS,
    action: permissionActions.READ,
  },
  {
    name: 'events_read',
    nameAr: 'ظ‚ط±ط§ط،ط© ط§ظ„ط£ط­ط¯ط§ط«',
    resource: permissionResources.EVENTS,
    action: permissionActions.READ,
  },
];

/**
 * Default Roles
 */
export const defaultRoles = {
  admin: {
    name: 'admin',
    nameAr: 'ظ…ط¯ظٹط±',
    permissions: ['manage_all'], // Will be resolved to actual permission IDs
  },
  user: {
    name: 'user',
    nameAr: 'ظ…ط³طھط®ط¯ظ…',
    permissions: [
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
    ], // Will be resolved to actual permission IDs
  },
  municipalityAdmin: {
    name: 'municipality_admin',
    nameAr: 'ظ…ط¯ظٹط± ط¨ظ„ط¯ظٹط©',
    permissions: [
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
    ], // Will be resolved to actual permission IDs
  },
} as const;

