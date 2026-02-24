"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import toast from "react-hot-toast"
import { Loading } from "@/components/ui/loading"

type OrgLabels = {
  branchLabel: string
  pointLabel: string
  vehicleLabel: string
  driverLabel: string
  routeLabel: string
  lineSupervisorLabel: string
  surveyLabel: string
  eventsReportLabel: string
  latestEventsLabel: string
}

type Organization = {
  _id: string
  name: string
  slug: string
  type?: string
  labels: OrgLabels
  isActive: boolean
}

const defaultLabels: OrgLabels = {
  branchLabel: "فرع",
  pointLabel: "نقطة",
  vehicleLabel: "مركبة",
  driverLabel: "سائق",
  routeLabel: "مسار",
  lineSupervisorLabel: "مشرفو الخط",
  surveyLabel: "الاستبيانات",
  eventsReportLabel: "تقارير الأحداث",
  latestEventsLabel: "آخر الأحداث",
}

const emptyForm: Partial<Organization> = {
  name: "",
  slug: "",
  type: "",
  labels: defaultLabels,
  isActive: true,
}

type OrganizationAdminForm = {
  adminUserName: string
  adminUserEmail: string
  adminUserPassword: string
}

const emptyAdminForm: OrganizationAdminForm = {
  adminUserName: "",
  adminUserEmail: "",
  adminUserPassword: "",
}

export function OrganizationsTable() {
  const [items, setItems] = useState<Organization[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Organization | null>(null)
  const [form, setForm] = useState<Partial<Organization>>(emptyForm)
  const [adminForm, setAdminForm] = useState<OrganizationAdminForm>(emptyAdminForm)

  const load = async () => {
    setLoading(true)
    try {
      const data = await apiClient.get("/organizations")
      setItems(data.organizations || data.data?.organizations || [])
    } catch (error: any) {
      toast.error(error.message || "فشل تحميل المؤسسات")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm, labels: { ...defaultLabels } })
    setAdminForm({ ...emptyAdminForm })
    setOpen(true)
  }

  const openEdit = async (item: Organization) => {
    setEditing(item)
    setForm({
      ...item,
      type: item.type || "",
      labels: { ...defaultLabels, ...(item.labels || {}) },
    })
    setAdminForm({ ...emptyAdminForm })
    setOpen(true)
    try {
      const data = await apiClient.get(`/organizations/${item._id}`)
      const org = data.organization || data
      const admin = data.adminUser
      if (org) {
        setForm({
          ...org,
          type: (org as any).type || "",
          labels: { ...defaultLabels, ...(org.labels || {}) },
        })
      }
      if (admin) {
        setAdminForm({
          adminUserName: admin.name || "",
          adminUserEmail: admin.email || "",
          adminUserPassword: "",
        })
      }
    } catch (_) {
      // keep form as from item
    }
  }

  const submit = async () => {
    if (!form.name || !form.slug) {
      toast.error("اسم المؤسسة والرمز مطلوبان")
      return
    }

    const payload = {
      name: form.name,
      slug: form.slug,
      type: form.type || null,
      labels: form.labels || defaultLabels,
      isActive: form.isActive ?? true,
      ...(editing
        ? {
            ...(adminForm.adminUserName !== undefined && { adminUserName: adminForm.adminUserName }),
            ...(adminForm.adminUserEmail !== undefined && { adminUserEmail: adminForm.adminUserEmail }),
            ...(adminForm.adminUserPassword !== undefined && adminForm.adminUserPassword !== "" && { adminUserPassword: adminForm.adminUserPassword }),
          }
        : adminForm),
    }

    try {
      if (editing) {
        await apiClient.patch(`/organizations/${editing._id}`, payload)
        toast.success("تم تحديث المؤسسة")
      } else {
        if (!adminForm.adminUserName || !adminForm.adminUserEmail || !adminForm.adminUserPassword) {
          toast.error("بيانات حساب مدير المؤسسة مطلوبة")
          return
        }
        await apiClient.post("/organizations", payload)
        toast.success("تم إنشاء المؤسسة")
      }
      setOpen(false)
      await load()
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const remove = async (item: Organization) => {
    if (!confirm(`حذف المؤسسة ${item.name}؟`)) return
    try {
      await apiClient.delete(`/organizations/${item._id}`)
      setItems((prev) => prev.filter((i) => i._id !== item._id))
      toast.success("تم حذف المؤسسة")
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const updateLabel = (key: keyof OrgLabels, value: string) => {
    setForm((prev) => ({
      ...prev,
      labels: {
        ...defaultLabels,
        ...(prev.labels || {}),
        [key]: value,
      },
    }))
  }

  return (
    <Card className="text-right">
      <CardHeader>
        <div className="flex items-center justify-between flex-row-reverse">
          <CardTitle>المؤسسات</CardTitle>
          <Button onClick={openCreate}>إضافة مؤسسة</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-right">
                  <th className="p-2">الاسم</th>
                  <th className="p-2">الرمز</th>
                  <th className="p-2">النوع</th>
                  <th className="p-2">تسمية الفروع</th>
                  <th className="p-2">الحالة</th>
                  <th className="p-2">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className="border-b">
                    <td className="p-2">{item.name}</td>
                    <td className="p-2">{item.slug}</td>
                    <td className="p-2">{item.type || "-"}</td>
                    <td className="p-2">{item.labels?.branchLabel || "فرع"}</td>
                    <td className="p-2">{item.isActive ? "مفعلة" : "معطلة"}</td>
                    <td className="p-2 space-x-2 space-x-reverse">
                      <Button variant="outline" onClick={() => openEdit(item)}>تعديل</Button>
                      <Button variant="destructive" onClick={() => remove(item)}>حذف</Button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-muted-foreground" colSpan={6}>
                      لا توجد مؤسسات بعد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="text-right max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل المؤسسة" : "إضافة مؤسسة"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div>
              <Label>اسم المؤسسة</Label>
              <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>الرمز (slug)</Label>
              <Input value={form.slug || ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div>
              <Label>نوع المؤسسة</Label>
              <Input value={form.type || ""} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="مثال: waste أو school" />
            </div>

            <div className="pt-2 border-t">
              <div className="text-sm text-muted-foreground mb-2">تسميات النظام</div>
            </div>

            <div>
              <Label>تسمية الفرع</Label>
              <Input value={form.labels?.branchLabel || ""} onChange={(e) => updateLabel("branchLabel", e.target.value)} />
            </div>
            <div>
              <Label>تسمية النقاط</Label>
              <Input value={form.labels?.pointLabel || ""} onChange={(e) => updateLabel("pointLabel", e.target.value)} />
            </div>
            <div>
              <Label>تسمية المركبات</Label>
              <Input value={form.labels?.vehicleLabel || ""} onChange={(e) => updateLabel("vehicleLabel", e.target.value)} />
            </div>
            <div>
              <Label>تسمية السائقين</Label>
              <Input value={form.labels?.driverLabel || ""} onChange={(e) => updateLabel("driverLabel", e.target.value)} />
            </div>
            <div>
              <Label>تسمية المسارات</Label>
              <Input value={form.labels?.routeLabel || ""} onChange={(e) => updateLabel("routeLabel", e.target.value)} />
            </div>
            <div>
              <Label>تسمية مشرفي الخط</Label>
              <Input value={form.labels?.lineSupervisorLabel || ""} onChange={(e) => updateLabel("lineSupervisorLabel", e.target.value)} />
            </div>
            <div>
              <Label>تسمية الاستبيانات</Label>
              <Input value={form.labels?.surveyLabel || ""} onChange={(e) => updateLabel("surveyLabel", e.target.value)} />
            </div>
            <div>
              <Label>تسمية تقارير الأحداث</Label>
              <Input value={form.labels?.eventsReportLabel || ""} onChange={(e) => updateLabel("eventsReportLabel", e.target.value)} />
            </div>
            <div>
              <Label>تسمية قسم آخر الأحداث</Label>
              <Input value={form.labels?.latestEventsLabel || ""} onChange={(e) => updateLabel("latestEventsLabel", e.target.value)} />
            </div>

            {!editing && (
              <>
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground mb-2">حساب مدير المؤسسة (إجباري)</div>
                </div>
                <div>
                  <Label>اسم المستخدم</Label>
                  <Input
                    value={adminForm.adminUserName}
                    onChange={(e) => setAdminForm({ ...adminForm, adminUserName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>البريد الإلكتروني</Label>
                  <Input
                    type="email"
                    value={adminForm.adminUserEmail}
                    onChange={(e) => setAdminForm({ ...adminForm, adminUserEmail: e.target.value })}
                  />
                </div>
                <div>
                  <Label>كلمة المرور</Label>
                  <Input
                    type="password"
                    value={adminForm.adminUserPassword}
                    onChange={(e) => setAdminForm({ ...adminForm, adminUserPassword: e.target.value })}
                  />
                </div>
              </>
            )}

            {editing && (
              <>
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground mb-2">حساب مدير المؤسسة</div>
                </div>
                <div>
                  <Label>اسم المستخدم</Label>
                  <Input
                    value={adminForm.adminUserName}
                    onChange={(e) => setAdminForm({ ...adminForm, adminUserName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>البريد الإلكتروني</Label>
                  <Input
                    type="email"
                    value={adminForm.adminUserEmail}
                    onChange={(e) => setAdminForm({ ...adminForm, adminUserEmail: e.target.value })}
                  />
                </div>
                <div>
                  <Label>كلمة المرور (اتركه فارغاً إذا لم تُرد تغييره)</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={adminForm.adminUserPassword}
                    onChange={(e) => setAdminForm({ ...adminForm, adminUserPassword: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-between border rounded-lg p-2">
              <span>مفعلة</span>
              <Switch checked={!!form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
            </div>
          </div>

          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={submit}>{editing ? "تحديث" : "إنشاء"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
