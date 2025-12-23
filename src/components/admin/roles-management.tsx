"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2, AlertTriangle, RefreshCw } from "lucide-react"
import toast from "react-hot-toast"
import { getRequest, deleteRequest } from "@/lib/api/helpers"
import { RoleForm } from "./role-form"
import { PermissionForm } from "./permission-form"
import { LoadingCard } from "@/components/ui/loading"
import { apiClient } from "@/lib/api/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Permission {
  _id: string
  name: string
  nameAr: string
  resource: string
  action: string
}

interface Role {
  _id: string
  name: string
  nameAr: string
  permissions: Permission[]
  createdAt: string
}

interface RolesManagementProps {
  initialRoles?: Role[]
  initialPermissions?: Permission[]
}

export function RolesManagement({ initialRoles = [], initialPermissions = [] }: RolesManagementProps = {}) {
  const [roles, setRoles] = useState<Role[]>(initialRoles)
  const [permissions, setPermissions] = useState<Permission[]>(initialPermissions)
  const [loading, setLoading] = useState(initialRoles.length === 0 && initialPermissions.length === 0)
  const [roleFormOpen, setRoleFormOpen] = useState(false)
  const [permissionFormOpen, setPermissionFormOpen] = useState(false)
  const [deleteRoleDialogOpen, setDeleteRoleDialogOpen] = useState(false)
  const [deletePermissionDialogOpen, setDeletePermissionDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
  const [permissionToDelete, setPermissionToDelete] = useState<Permission | null>(null)
  const [deletingRole, setDeletingRole] = useState(false)
  const [deletingPermission, setDeletingPermission] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [rolesResponse, permissionsResponse] = await Promise.all([
        apiClient.get("/admin/roles"),
        apiClient.get("/admin/permissions"),
      ])

      // Handle different response structures
      // API returns: { data: { roles: [...] } }
      // apiClient.get() returns this directly, so rolesResponse = { data: { roles: [...] } }
      const roles = rolesResponse?.data?.roles || 
                    rolesResponse?.data?.data?.roles || 
                    rolesResponse?.roles || 
                    (Array.isArray(rolesResponse?.data) ? rolesResponse.data : [])
      
      const permissions = permissionsResponse?.data?.permissions || 
                          permissionsResponse?.data?.data?.permissions || 
                          permissionsResponse?.permissions || 
                          (Array.isArray(permissionsResponse?.data) ? permissionsResponse.data : [])

      if (Array.isArray(roles) && Array.isArray(permissions)) {
        setRoles(roles)
        setPermissions(permissions)
      } else {
        console.error("Invalid response structure:", { 
          rolesResponse, 
          permissionsResponse,
          rolesType: typeof roles,
          permissionsType: typeof permissions
        })
        toast.error("فشل تحميل البيانات - بنية الاستجابة غير صحيحة")
      }
    } catch (error: any) {
      console.error("Error fetching roles and permissions:", error)
      const errorMessage = error?.message || error?.error || "حدث خطأ في الاتصال"
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialRoles.length === 0 && initialPermissions.length === 0) {
      fetchData()
    }
  }, [initialRoles.length, initialPermissions.length, fetchData])

  const handleCreateRole = useCallback(() => {
    setSelectedRole(null)
    setRoleFormOpen(true)
  }, [])

  const handleEditRole = useCallback((role: Role) => {
    setSelectedRole(role)
    setRoleFormOpen(true)
  }, [])

  const handleDeleteRoleClick = useCallback((role: Role) => {
    setRoleToDelete(role)
    setDeleteRoleDialogOpen(true)
  }, [])

  const handleDeleteRole = useCallback(async () => {
    if (!roleToDelete) return

    setDeletingRole(true)
    try {
      const result = await apiClient.delete(`/admin/roles/${roleToDelete._id}`)

      if (!result.data) {
        toast.error(result.error || "فشل الحذف")
        return
      }

      toast.success("تم حذف الدور بنجاح")
      setDeleteRoleDialogOpen(false)
      setRoleToDelete(null)
      fetchData()
    } catch (error) {
      toast.error("حدث خطأ أثناء الحذف")
    } finally {
      setDeletingRole(false)
    }
  }, [fetchData, roleToDelete])

  const handleCreatePermission = useCallback(() => {
    setSelectedPermission(null)
    setPermissionFormOpen(true)
  }, [])

  const handleEditPermission = useCallback((permission: Permission) => {
    setSelectedPermission(permission)
    setPermissionFormOpen(true)
  }, [])

  const handleDeletePermissionClick = useCallback((permission: Permission) => {
    setPermissionToDelete(permission)
    setDeletePermissionDialogOpen(true)
  }, [])

  const handleDeletePermission = useCallback(async () => {
    if (!permissionToDelete) return

    setDeletingPermission(true)
    try {
      const result = await apiClient.delete(`/admin/permissions/${permissionToDelete._id}`)

      if (!result.data) {
        toast.error(result.error || "فشل الحذف")
        return
      }

      toast.success("تم حذف الصلاحية بنجاح")
      setDeletePermissionDialogOpen(false)
      setPermissionToDelete(null)
      fetchData()
    } catch (error) {
      toast.error("حدث خطأ أثناء الحذف")
    } finally {
      setDeletingPermission(false)
    }
  }, [fetchData, permissionToDelete])

  if (loading) {
    return <LoadingCard text="جاري تحميل البيانات..." />
  }

  return (
    <div className="space-y-6">
      {/* Permissions Section */}
      <Card className="text-right">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg sm:text-xl text-right">
            الصلاحيات ({permissions.length})
          </CardTitle>
          <Button onClick={handleCreatePermission} size="sm" className="flex-row-reverse">
            <Plus className="h-4 w-4 mr-2" />
            إضافة صلاحية
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {permissions.map((permission) => (
              <div
                key={permission._id}
                className="border rounded-lg p-4 flex items-center justify-between flex-row-reverse text-right"
              >
                <div className="text-right">
                  <p className="font-medium">{permission.nameAr}</p>
                  <p className="text-sm text-muted-foreground">
                    {permission.name} ({permission.resource}.{permission.action})
                  </p>
                </div>
                <div className="flex gap-2 flex-row-reverse">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditPermission(permission)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeletePermissionClick(permission)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Roles Section */}
      <Card className="text-right">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg sm:text-xl text-right">
            الأدوار ({roles.length})
          </CardTitle>
          <Button onClick={handleCreateRole} size="sm" className="flex-row-reverse">
            <Plus className="h-4 w-4 mr-2" />
            إضافة دور
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {roles.map((role) => (
              <div key={role._id} className="border rounded-lg p-4 text-right">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                  <div className="text-right">
                    <h3 className="text-base sm:text-lg font-semibold">{role.nameAr}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{role.name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {role.permissions?.length || 0} صلاحية
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditRole(role)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRoleClick(role)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {role.permissions?.map((permission) => (
                    <span
                      key={permission._id}
                      className="inline-flex items-center rounded-full bg-primary/10 px-2 sm:px-3 py-1 text-xs font-medium text-primary"
                    >
                      {permission.nameAr} ({permission.resource}.{permission.action})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Forms */}
      <RoleForm
        open={roleFormOpen}
        onOpenChange={setRoleFormOpen}
        role={selectedRole}
        permissions={permissions}
        onSuccess={fetchData}
      />

      <PermissionForm
        open={permissionFormOpen}
        onOpenChange={setPermissionFormOpen}
        permission={selectedPermission}
        onSuccess={fetchData}
      />

      {/* Delete Role Dialog */}
      <Dialog open={deleteRoleDialogOpen} onOpenChange={setDeleteRoleDialogOpen}>
        <DialogContent className="text-right">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              تأكيد حذف الدور
            </DialogTitle>
            <DialogDescription className="text-right">
              هل أنت متأكد من حذف الدور <strong>{roleToDelete?.nameAr}</strong>؟
              <br />
              <span className="text-sm text-muted-foreground">
                هذه العملية لا يمكن التراجع عنها.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:gap-2 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteRoleDialogOpen(false)
                setRoleToDelete(null)
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRole}
              disabled={deletingRole}
            >
              {deletingRole ? (
                <>
                  <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                "حذف"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Permission Dialog */}
      <Dialog open={deletePermissionDialogOpen} onOpenChange={setDeletePermissionDialogOpen}>
        <DialogContent className="text-right">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              تأكيد حذف الصلاحية
            </DialogTitle>
            <DialogDescription className="text-right">
              هل أنت متأكد من حذف الصلاحية <strong>{permissionToDelete?.nameAr}</strong>؟
              <br />
              <span className="text-sm text-muted-foreground">
                هذه العملية لا يمكن التراجع عنها.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:gap-2 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeletePermissionDialogOpen(false)
                setPermissionToDelete(null)
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePermission}
              disabled={deletingPermission}
            >
              {deletingPermission ? (
                <>
                  <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                "حذف"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

