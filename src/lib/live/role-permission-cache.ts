import { TtlCache } from "./ttl-cache";

/**
 * Caches populated role+permissions to avoid DB lookups on every API call.
 * TTL: 5 minutes — role changes are infrequent.
 */
const rolePermissionCache = new TtlCache<any>(5 * 60 * 1000);

export function getCachedRolePermissions(roleId: string): any | null {
  return rolePermissionCache.get(roleId);
}

export async function getOrLoadRolePermissions(
  roleId: string,
  loader: () => Promise<any>,
): Promise<any> {
  return rolePermissionCache.getOrLoad(roleId, loader);
}
