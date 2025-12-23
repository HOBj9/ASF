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
import { permissionResources } from "@/constants/permissions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const permissionSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  nameAr: z.string().min(1, "الاسم بالعربية مطلوب"),
  resource: z.string().min(1, "المورد مطلوب"),
  action: z.enum(["create", "read", "update", "delete", "manage"], {
    required_error: "الإجراء مطلوب",
  }),
})

type PermissionFormValues = z.infer<typeof permissionSchema>

interface Permission {
  _id: string
  name: string
  nameAr: string
  resource: string
  action: string
}

interface PermissionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  permission?: Permission | null
  onSuccess: () => void
}

export function PermissionForm({
  open,
  onOpenChange,
  permission,
  onSuccess,
}: PermissionFormProps) {
  const [loading, setLoading] = useState(false)
  const isEditing = !!permission

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionSchema),
    defaultValues: {
      name: "",
      nameAr: "",
      resource: "",
      action: "read",
    },
  })

  const action = watch("action")
  const resource = watch("resource")

  // Resource names in Arabic
  const resourceNames: Record<string, string> = {
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

  // Get all resource values
  const resourceOptions = Object.values(permissionResources)

  useEffect(() => {
    if (permission) {
      reset({
        name: permission.name,
        nameAr: permission.nameAr,
        resource: permission.resource,
        action: permission.action as any,
      })
    } else {
      reset({
        name: "",
        nameAr: "",
        resource: "",
        action: "read",
      })
    }
  }, [permission, reset])

  const onSubmit = async (data: PermissionFormValues) => {
    setLoading(true)
    try {
      const result = isEditing
        ? await apiClient.patch(`/admin/permissions/${permission._id}`, data)
        : await apiClient.post("/admin/permissions", data)

      if (!result.data) {
        toast.error(result.error || "حدث خطأ")
      } else {
        toast.success(
          isEditing ? "تم تحديث الصلاحية بنجاح" : "تم إنشاء الصلاحية بنجاح"
        )
        onOpenChange(false)
        onSuccess()
      }
    } catch (error) {
      toast.error("حدث خطأ غير متوقع")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "تعديل الصلاحية" : "إنشاء صلاحية جديدة"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "قم بتعديل بيانات الصلاحية"
              : "املأ البيانات التالية لإنشاء صلاحية جديدة"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">الاسم (بالإنجليزية)</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="users_read"
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
              placeholder="قراءة المستخدمين"
            />
            {errors.nameAr && (
              <p className="text-sm text-destructive">{errors.nameAr.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource">المورد</Label>
            <Select
              value={resource}
              onValueChange={(value) => setValue("resource", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر المورد" />
              </SelectTrigger>
              <SelectContent>
                {resourceOptions.map((resourceValue) => (
                  <SelectItem key={resourceValue} value={resourceValue}>
                    {resourceNames[resourceValue] || resourceValue} ({resourceValue})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.resource && (
              <p className="text-sm text-destructive">{errors.resource.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="action">الإجراء</Label>
            <Select
              value={action}
              onValueChange={(value) => setValue("action", value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الإجراء" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="create">إنشاء (create)</SelectItem>
                <SelectItem value="read">قراءة (read)</SelectItem>
                <SelectItem value="update">تحديث (update)</SelectItem>
                <SelectItem value="delete">حذف (delete)</SelectItem>
                <SelectItem value="manage">إدارة (manage)</SelectItem>
              </SelectContent>
            </Select>
            {errors.action && (
              <p className="text-sm text-destructive">{errors.action.message}</p>
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

