import { IRole } from "@/models/Role"
import { IPermission } from "@/models/Permission"

export function hasPermission(role: IRole | null, resource: string, action: string): boolean {
  if (!role || !role.permissions) {
    return false
  }

  return role.permissions.some((permission: any) => {
    // Handle both populated and unpopulated permissions
    if (typeof permission === 'object' && permission.resource) {
      return permission.resource === resource && permission.action === action
    }
    return false
  })
}

export function hasAnyPermission(role: IRole | null, permissions: Array<{ resource: string; action: string }>): boolean {
  return permissions.some(({ resource, action }) => hasPermission(role, resource, action))
}

export function hasAllPermissions(role: IRole | null, permissions: Array<{ resource: string; action: string }>): boolean {
  return permissions.every(({ resource, action }) => hasPermission(role, resource, action))
}

export function isAdmin(role: IRole | null): boolean {
  if (!role) return false
  
  // Check by role name (most reliable)
  if (typeof role === 'object' && 'name' in role && role.name === 'super_admin') {
    return true
  }
  
  // Check by permission
  if (hasPermission(role, 'all', 'manage')) {
    return true
  }
  
  // Check if permissions array contains manage_all
  if (!role.permissions || !Array.isArray(role.permissions)) return false
  
  return role.permissions.some((p: any) => 
    typeof p === 'object' && 
    ((p.resource === 'all' && p.action === 'manage') || p.name === 'manage_all')
  )
}

export function isOrganizationAdmin(role: IRole | null): boolean {
  if (!role) return false
  if (typeof role === 'string') return role === 'organization_admin'
  if (typeof role === 'object' && 'name' in role) {
    return role.name === 'organization_admin'
  }
  return false
}

export function isLineSupervisor(role: IRole | null): boolean {
  if (!role) return false
  if (typeof role === 'string') return role === 'line_supervisor'
  if (typeof role === 'object' && 'name' in role) {
    return role.name === 'line_supervisor'
  }
  return false
}

