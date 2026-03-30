"use client"

import { useCallback, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { useLabels } from "@/hooks/use-labels"
import { apiClient } from "@/lib/api/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ActionButton } from "@/components/ui/action-button"

type Branch = {
  _id: string
  name?: string
  nameAr?: string
}

type VehicleOption = {
  _id: string
  name: string
  plateNumber?: string | null
  branchId?: string | { _id: string; name?: string; nameAr?: string } | null
  trackingProvider?: "athar" | "mobile_app" | "traccar"
}

type LineSupervisorUser = {
  _id: string
  name: string
  email: string
  role?: { name: string; nameAr?: string }
  branchId?: string | { _id: string; name?: string; nameAr?: string } | null
  trackingVehicleId?: string | VehicleOption | null
  isActive?: boolean
  createdAt?: string
}

type FormState = {
  name: string
  email: string
  password: string
  branchId: string
  trackingVehicleId: string
  isActive: boolean
}

interface LineSupervisorsManagerProps {
  organizationId: string
  initialUsers: LineSupervisorUser[]
  branches: Branch[]
  vehicles: VehicleOption[]
}

function resolveBranchLabel(branch?: string | { _id: string; name?: string; nameAr?: string } | null): string {
  if (!branch) return "—"
  if (typeof branch === "object") {
    return branch.nameAr || branch.name || "—"
  }
  return "—"
}

function resolveBranchId(branch?: string | { _id: string; name?: string; nameAr?: string } | null): string {
  if (!branch) return ""
  if (typeof branch === "object") {
    return String(branch._id || "")
  }
  return String(branch)
}

function resolveVehicleId(vehicle?: string | VehicleOption | null): string {
  if (!vehicle) return ""
  if (typeof vehicle === "object") {
    return String(vehicle._id || "")
  }
  return String(vehicle)
}

function resolveVehicleLabel(
  vehicle?: string | VehicleOption | null,
  fallbackVehicles: VehicleOption[] = [],
): string {
  const resolved =
    vehicle && typeof vehicle === "object"
      ? vehicle
      : vehicle
        ? fallbackVehicles.find((item) => String(item._id) === String(vehicle)) || null
        : null

  if (!resolved) return "—"
  return `${resolved.name}${resolved.plateNumber ? ` (${resolved.plateNumber})` : ""}`
}

function createEmptyForm(): FormState {
  return {
    name: "",
    email: "",
    password: "",
    branchId: "",
    trackingVehicleId: "",
    isActive: true,
  }
}

export function LineSupervisorsManager({
  organizationId,
  initialUsers,
  branches,
  vehicles,
}: LineSupervisorsManagerProps) {
  const { labels } = useLabels()
  const [users, setUsers] = useState<LineSupervisorUser[]>(initialUsers)
  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<LineSupervisorUser | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<FormState>(createEmptyForm)

  const decorateUser = useCallback((user: any): LineSupervisorUser => {
    const branch = branches.find((item) => String(item._id) === String(user.branchId))
    const vehicle = vehicles.find((item) => String(item._id) === String(user.trackingVehicleId))

    return {
      ...user,
      branchId: branch ? { _id: branch._id, name: branch.name, nameAr: branch.nameAr } : user.branchId || null,
      trackingVehicleId: vehicle || user.trackingVehicleId || null,
    }
  }, [branches, vehicles])

  const resetForm = useCallback(() => {
    setEditingUser(null)
    setForm(createEmptyForm())
  }, [])

  const closeDialog = useCallback((nextOpen: boolean) => {
    setFormOpen(nextOpen)
    if (!nextOpen) {
      resetForm()
    }
  }, [resetForm])

  const availableVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const branchId =
        vehicle.branchId && typeof vehicle.branchId === "object" && "_id" in vehicle.branchId
          ? String(vehicle.branchId._id)
          : vehicle.branchId
            ? String(vehicle.branchId)
            : ""
      return branchId === form.branchId
    })
  }, [vehicles, form.branchId])

  const openCreate = useCallback(() => {
    resetForm()
    setFormOpen(true)
  }, [resetForm])

  const openEdit = useCallback((user: LineSupervisorUser) => {
    setEditingUser(user)
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      branchId: resolveBranchId(user.branchId),
      trackingVehicleId: resolveVehicleId(user.trackingVehicleId),
      isActive: user.isActive !== false,
    })
    setFormOpen(true)
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name.trim() || !form.email.trim()) {
      toast.error("الاسم والبريد الإلكتروني مطلوبان")
      return
    }

    if (!form.branchId) {
      toast.error("الفرع مطلوب. مشرف الخط يجب أن يكون مرتبطًا بفرع واحد.")
      return
    }

    if (!editingUser && !form.password) {
      toast.error("كلمة المرور مطلوبة")
      return
    }

    if (form.password && form.password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل")
      return
    }

    setSubmitting(true)

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        branchId: form.branchId,
        trackingVehicleId: form.trackingVehicleId || undefined,
        isActive: form.isActive,
        ...(form.password ? { password: form.password } : {}),
      }

      const response = editingUser
        ? await apiClient.patch(`/organizations/${organizationId}/line-supervisors`, {
            userId: editingUser._id,
            ...payload,
          })
        : await apiClient.post(`/organizations/${organizationId}/line-supervisors`, payload)

      const returnedUser = response?.data?.user || response?.user
      if (!returnedUser) {
        throw new Error(response?.error || "حدث خطأ غير متوقع")
      }

      const nextUser = decorateUser(returnedUser)

      if (editingUser) {
        setUsers((prev) => prev.map((user) => (user._id === editingUser._id ? nextUser : user)))
        toast.success(`تم تحديث ${labels.lineSupervisorLabel} بنجاح`)
      } else {
        setUsers((prev) => [nextUser, ...prev])
        toast.success(`تم إضافة ${labels.lineSupervisorLabel} بنجاح`)
      }

      closeDialog(false)
    } catch (err: any) {
      toast.error(err?.message || `فشل في حفظ ${labels.lineSupervisorLabel}`)
    } finally {
      setSubmitting(false)
    }
  }, [organizationId, form, editingUser, decorateUser, closeDialog, labels.lineSupervisorLabel])

  return (
    <>
      <Card className="text-right">
        <CardHeader>
          <div className="flex items-center justify-between flex-row-reverse">
            <CardTitle className="text-right">قائمة {labels.lineSupervisorLabel} ({users.length})</CardTitle>
            <ActionButton
              action="create"
              onClick={openCreate}
              customLabel={`إضافة ${labels.lineSupervisorLabel}`}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-3 font-medium">الاسم</th>
                  <th className="p-3 font-medium">البريد الإلكتروني</th>
                  <th className="p-3 font-medium">{labels.branchLabel || "الفرع"}</th>
                  <th className="p-3 font-medium">{labels.vehicleLabel || "المركبة"}</th>
                  <th className="p-3 font-medium text-center">الحالة</th>
                  <th className="p-3 font-medium">تاريخ الإضافة</th>
                  <th className="p-3 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      لا يوجد {labels.lineSupervisorLabel} بعد. اضغط &quot;إضافة {labels.lineSupervisorLabel}&quot; للبدء.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">{user.name}</td>
                      <td className="p-3">{user.email}</td>
                      <td className="p-3">{resolveBranchLabel(user.branchId)}</td>
                      <td className="p-3">{resolveVehicleLabel(user.trackingVehicleId, vehicles)}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                            user.isActive !== false
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                              : "bg-destructive/20 text-destructive"
                          }`}
                        >
                          {user.isActive !== false ? "نشط" : "غير نشط"}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString("ar-SY", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="p-3">
                        <ActionButton
                          action="edit"
                          onClick={() => openEdit(user)}
                          customLabel="تعديل"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[500px] text-right">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? `تعديل ${labels.lineSupervisorLabel}` : `إضافة ${labels.lineSupervisorLabel}`}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? `حدّث بيانات ${labels.lineSupervisorLabel} وربطه بالمركبة المناسبة لتفعيل تتبع الموبايل.`
                : `أدخل بيانات ${labels.lineSupervisorLabel} الجديد. يمكن ربطه بمركبة ليصبح جاهزًا لتفعيل تتبع الموبايل.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ls-name">الاسم</Label>
              <Input
                id="ls-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="اسم مشرف الخط"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ls-email">البريد الإلكتروني</Label>
              <Input
                id="ls-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="email@example.com"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ls-branch">{labels.branchLabel || "الفرع"} *</Label>
              <Select
                value={form.branchId}
                onValueChange={(value) => setForm((prev) => ({ ...prev, branchId: value, trackingVehicleId: "" }))}
                disabled={submitting}
              >
                <SelectTrigger id="ls-branch" className="text-right">
                  <SelectValue placeholder={`اختر ${labels.branchLabel || "الفرع"}`} />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch._id} value={branch._id}>
                      {branch.nameAr || branch.name || branch._id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ls-vehicle">{labels.vehicleLabel || "المركبة"} (اختياري)</Label>
              <Select
                value={form.trackingVehicleId || "none"}
                onValueChange={(value) => setForm((prev) => ({ ...prev, trackingVehicleId: value === "none" ? "" : value }))}
                disabled={submitting || !form.branchId}
              >
                <SelectTrigger id="ls-vehicle" className="text-right">
                  <SelectValue
                    placeholder={
                      form.branchId
                        ? `اختر ${labels.vehicleLabel || "المركبة"}`
                        : `اختر ${labels.branchLabel || "الفرع"} أولًا`
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون ربط</SelectItem>
                  {availableVehicles.map((vehicle) => (
                    <SelectItem key={vehicle._id} value={vehicle._id}>
                      {vehicle.name}{vehicle.plateNumber ? ` (${vehicle.plateNumber})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ls-password">
                {editingUser ? "كلمة المرور الجديدة (اختياري)" : "كلمة المرور"}
              </Label>
              <Input
                id="ls-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder={editingUser ? "اتركها فارغة للإبقاء على الحالية" : "6 أحرف على الأقل"}
                disabled={submitting}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="ls-active" className="text-right">الحساب نشط</Label>
              <Checkbox
                id="ls-active"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: !!checked }))}
                disabled={submitting}
              />
            </div>

            <DialogFooter className="flex-row-reverse gap-2">
              <ActionButton type="button" action="cancel" onClick={() => closeDialog(false)} disabled={submitting} />
              <ActionButton
                type="submit"
                action={editingUser ? "update" : "save"}
                loading={submitting}
                disabled={submitting}
                customLabel={editingUser ? "تحديث" : "إضافة"}
              />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
