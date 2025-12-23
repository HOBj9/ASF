"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiClient } from "@/lib/api/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"

const roleSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  nameAr: z.string().min(1, "الاسم بالعربية مطلوب"),
  permissions: z.array(z.string()),
})

type RoleFormValues = z.infer<typeof roleSchema>

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
}

interface RoleFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role?: Role | null
  permissions: Permission[]
  onSuccess: () => void
}

export function RoleForm({ open, onOpenChange, role, permissions, onSuccess }: RoleFormProps) {
  const [loading, setLoading] = useState(false)
  const isEditing = !!role

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      nameAr: "",
      permissions: [],
    },
  })

  const selectedPermissions = watch("permissions")

  useEffect(() => {
    if (role) {
      reset({
        name: role.name,
        nameAr: role.nameAr,
        permissions: role.permissions?.map((p) => p._id) || [],
      })
    } else {
      reset({
        name: "",
        nameAr: "",
        permissions: [],
      })
    }
  }, [role, reset])

  const togglePermission = (permissionId: string) => {
    const current = selectedPermissions || []
    if (current.includes(permissionId)) {
      setValue("permissions", current.filter((id) => id !== permissionId))
    } else {
      setValue("permissions", [...current, permissionId])
    }
  }

  // Group permissions by resource
  const groupedPermissions = permissions.reduce((acc, permission) => {
    const resource = permission.resource
    if (!acc[resource]) {
      acc[resource] = []
    }
    acc[resource].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  // Get resource Arabic names
  const getResourceName = (resource: string): string => {
    const names: Record<string, string> = {
      all: 'الكل',
      users: 'المستخدمين',
      roles: 'الأدوار',
      permissions: 'الصلاحيات',
      sessions: 'الجلسات',
      messages: 'الرسائل',
      contacts: 'جهات الاتصال',
      chats: 'المحادثات',
      auto_replies: 'الردود التلقائية',
      api_keys: 'مفاتيح API',
      contact_groups: 'مجموعات جهات الاتصال',
    }
    return names[resource] || resource
  }

  // Toggle all permissions for a resource
  const toggleAllForResource = (resource: string) => {
    const resourcePermissions = groupedPermissions[resource] || []
    const resourcePermissionIds = resourcePermissions.map(p => p._id)
    const current = selectedPermissions || []
    
    // Check if all are selected
    const allSelected = resourcePermissionIds.every(id => current.includes(id))
    
    if (allSelected) {
      // Deselect all
      setValue("permissions", current.filter(id => !resourcePermissionIds.includes(id)))
    } else {
      // Select all
      const newPermissions = [...current]
      resourcePermissionIds.forEach(id => {
        if (!newPermissions.includes(id)) {
          newPermissions.push(id)
        }
      })
      setValue("permissions", newPermissions)
    }
  }

  // Check if all permissions for a resource are selected
  const isAllSelectedForResource = (resource: string): boolean => {
    const resourcePermissions = groupedPermissions[resource] || []
    if (resourcePermissions.length === 0) return false
    const resourcePermissionIds = resourcePermissions.map(p => p._id)
    const current = selectedPermissions || []
    return resourcePermissionIds.every(id => current.includes(id))
  }

  const onSubmit = async (data: RoleFormValues) => {
    setLoading(true)
    try {
      const result = isEditing
        ? await apiClient.patch(`/admin/roles/${role._id}`, data)
        : await apiClient.post("/admin/roles", data)

      // Check if the response has data or message (success case)
      if (result.error) {
        toast.error(result.error)
      } else if (result.message || result.data || result.role) {
        // Success - API returns { message: "...", role: {...} }
        const successMessage = result.message || (isEditing ? "تم تحديث الدور بنجاح" : "تم إنشاء الدور بنجاح")
        toast.success(successMessage)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error("حدث خطأ غير متوقع")
      }
    } catch (error: any) {
      // Extract error message from different error formats
      const errorMessage = 
        error?.message || 
        error?.error || 
        error?.response?.data?.error ||
        error?.data?.error ||
        "حدث خطأ غير متوقع"
      console.error("Error updating role:", error)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "تعديل الدور" : "إنشاء دور جديد"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "قم بتعديل بيانات الدور" : "املأ البيانات التالية لإنشاء دور جديد"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">الاسم (بالإنجليزية)</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="admin"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nameAr">الاسم (بالعربية)</Label>
            <Input
              id="nameAr"
              {...register("nameAr")}
              placeholder="مدير"
            />
            {errors.nameAr && (
              <p className="text-sm text-destructive">{errors.nameAr.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>الصلاحيات</Label>
            <div className="border rounded-lg p-4 max-h-96 overflow-y-auto space-y-4">
              {Object.entries(groupedPermissions).map(([resource, resourcePermissions]) => (
                <div key={resource} className="space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <h4 className="font-semibold text-sm text-foreground">
                      {getResourceName(resource)}
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAllForResource(resource)}
                      className="h-7 text-xs"
                    >
                      {isAllSelectedForResource(resource) ? 'إلغاء الكل' : 'اختيار الكل'}
                    </Button>
                  </div>
                  <div className="space-y-2 pr-4">
                    {resourcePermissions.map((permission) => (
                      <div key={permission._id} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id={permission._id}
                          checked={selectedPermissions?.includes(permission._id) || false}
                          onCheckedChange={() => togglePermission(permission._id)}
                        />
                        <label
                          htmlFor={permission._id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {permission.nameAr} ({permission.resource}.{permission.action})
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {errors.permissions && (
              <p className="text-sm text-destructive">{errors.permissions.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "جاري الحفظ..." : isEditing ? "تحديث" : "إنشاء"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

