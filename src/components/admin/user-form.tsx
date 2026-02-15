"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { isAdmin } from "@/lib/permissions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ActionButton } from "@/components/ui/action-button"
import { apiClient } from "@/lib/api/client"
import toast from "react-hot-toast"
import { useLabels } from "@/hooks/use-labels"

const userFormSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون على الأقل حرفين"),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  phone: z.string().optional(),
  password: z.string().min(6, "كلمة المرور يجب أن تكون على الأقل 6 أحرف"),
  role: z.string().min(1, "يجب اختيار دور"),
  branchId: z.string().optional(),
  isActive: z.boolean().default(true),
})

type UserFormValues = z.infer<typeof userFormSchema>

interface Role {
  _id: string
  name: string
  nameAr: string
}

interface Branch {
  _id: string
  name: string
}

interface Organization {
  _id: string
  name: string
}

interface UserFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function UserForm({ open, onOpenChange, onSuccess }: UserFormProps) {
  const { data: session } = useSession()
  const [roles, setRoles] = useState<Role[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("")
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { labels } = useLabels()
  const userIsAdmin = isAdmin(session?.user?.role as any)

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      role: "",
      branchId: "",
      isActive: true,
    },
  })

  useEffect(() => {
    if (open) {
      fetchRoles()
      if (userIsAdmin) {
        fetchOrganizations()
        setSelectedOrganizationId("")
        setBranches([])
      } else {
        fetchBranches(null)
      }
    }
  }, [open, userIsAdmin])

  useEffect(() => {
    if (open && userIsAdmin && selectedOrganizationId) {
      fetchBranches(selectedOrganizationId)
    } else if (open && userIsAdmin && !selectedOrganizationId) {
      setBranches([])
    }
  }, [open, userIsAdmin, selectedOrganizationId])

  const fetchRoles = async () => {
    setLoadingRoles(true)
    try {
      const response = await apiClient.get("/admin/roles")
      const rolesData = response.data?.roles || response.data?.data?.roles || response.roles
      if (rolesData && Array.isArray(rolesData)) {
        setRoles(rolesData)
      }
    } catch (error) {
      console.error("Failed to fetch roles:", error)
      toast.error("فشل في تحميل الأدوار")
    } finally {
      setLoadingRoles(false)
    }
  }

  const fetchOrganizations = async () => {
    try {
      const res = await apiClient.get("/organizations").catch(() => ({ organizations: [] } as any))
      const list = res.organizations || res.data?.organizations || []
      setOrganizations(list)
    } catch (error) {
      console.error("Failed to fetch organizations:", error)
      toast.error("فشل في تحميل المؤسسات")
    }
  }

  const fetchBranches = async (organizationId: string | null) => {
    setLoadingBranches(true)
    try {
      if (userIsAdmin && !organizationId) {
        setBranches([])
        setLoadingBranches(false)
        return
      }
      const url = organizationId ? `/branches?organizationId=${organizationId}` : "/branches"
      const response = await apiClient.get(url)
      const data = response.branches || response.data?.branches || response.data?.data?.branches
      if (Array.isArray(data)) {
        setBranches(data)
      } else {
        setBranches([])
      }
    } catch (error) {
      console.error("Failed to fetch branches:", error)
      toast.error(`فشل في تحميل ${labels.branchLabel}`)
      setBranches([])
    } finally {
      setLoadingBranches(false)
    }
  }

  const onSubmit = async (values: UserFormValues) => {
    setSubmitting(true)
    try {
      const payload = { ...values }
      if (!payload.branchId) delete (payload as any).branchId
      if (userIsAdmin && selectedOrganizationId) (payload as any).organizationId = selectedOrganizationId

      const data = await apiClient.post("/admin/users", payload)
      if (!data.data) {
        throw new Error(data.error || "حدث خطأ")
      }

      toast.success("تم إنشاء المستخدم بنجاح")
      form.reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء إنشاء المستخدم")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-right">إضافة مستخدم جديد</DialogTitle>
          <DialogDescription className="text-right">
            قم بملء البيانات التالية لإنشاء مستخدم جديد في النظام.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-right">الاسم</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="أدخل اسم المستخدم"
                className="text-right"
                disabled={submitting}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive text-right">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-right">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                placeholder="example@email.com"
                className="text-right"
                disabled={submitting}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive text-right">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-right">رقم الهاتف</Label>
              <Input
                id="phone"
                type="tel"
                {...form.register("phone")}
                placeholder="+966XXXXXXXXX"
                className="text-right"
                disabled={submitting}
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-destructive text-right">{form.formState.errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-right">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                {...form.register("password")}
                placeholder="أدخل كلمة المرور"
                className="text-right"
                disabled={submitting}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive text-right">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-right">الدور</Label>
              <Select
                onValueChange={(value) => form.setValue("role", value)}
                defaultValue={form.watch("role")}
                disabled={submitting || loadingRoles}
              >
                <SelectTrigger id="role" className="text-right">
                  <SelectValue placeholder={loadingRoles ? "جاري التحميل..." : "اختر الدور"} />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role._id} value={role._id}>
                      {role.nameAr || role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.role && (
                <p className="text-sm text-destructive text-right">{form.formState.errors.role.message}</p>
              )}
            </div>

            {userIsAdmin && (
              <div className="space-y-2">
                <Label className="text-right">المؤسسة</Label>
                <Select
                  value={selectedOrganizationId}
                  onValueChange={(v) => {
                    setSelectedOrganizationId(v)
                    form.setValue("branchId", "")
                  }}
                  disabled={submitting}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="اختر المؤسسة" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org._id} value={org._id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="branchId" className="text-right">{labels.branchLabel}</Label>
              <Select
                onValueChange={(value) => form.setValue("branchId", value)}
                value={form.watch("branchId")}
                disabled={submitting || loadingBranches || (userIsAdmin && !selectedOrganizationId)}
              >
                <SelectTrigger id="branchId" className="text-right">
                  <SelectValue placeholder={
                    userIsAdmin && !selectedOrganizationId
                      ? "اختر المؤسسة أولاً"
                      : loadingBranches
                        ? "جاري التحميل..."
                        : `اختيار ${labels.branchLabel} (اختياري)`
                  } />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch._id} value={branch._id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="isActive" className="text-right">المستخدم نشط</Label>
                <div className="text-sm text-muted-foreground text-right">
                  المستخدم النشط يمكنه تسجيل الدخول.
                </div>
              </div>
              <Checkbox
                id="isActive"
                checked={form.watch("isActive")}
                onCheckedChange={(checked) => form.setValue("isActive", checked as boolean)}
                disabled={submitting}
              />
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 flex-row-reverse gap-2 mt-4 pt-4 border-t">
            <ActionButton action="cancel" onClick={() => onOpenChange(false)} disabled={submitting} />
            <ActionButton action="save" type="submit" loading={submitting} disabled={submitting} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
