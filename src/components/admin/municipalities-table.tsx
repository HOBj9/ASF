"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import toast from "react-hot-toast"

const MapPicker = dynamic(
  () => import("@/components/ui/map-picker").then((m) => m.MapPicker),
  { ssr: false }
)

type Municipality = {
  _id: string
  name: string
  nameAr?: string
  governorate: string
  areaName?: string
  addressText?: string
  centerLat: number
  centerLng: number
  timezone: string
  atharKey?: string
  isActive: boolean
}

const emptyForm: Partial<Municipality> = {
  name: "",
  nameAr: "",
  governorate: "",
  areaName: "",
  addressText: "",
  centerLat: 0,
  centerLng: 0,
  timezone: "Asia/Damascus",
  atharKey: "",
  isActive: true,
}

type AdminUserForm = {
  adminUserName: string
  adminUserEmail: string
  adminUserPassword: string
}

const emptyAdminUser: AdminUserForm = {
  adminUserName: "",
  adminUserEmail: "",
  adminUserPassword: "",
}

export function MunicipalitiesTable() {
  const [items, setItems] = useState<Municipality[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Municipality | null>(null)
  const [form, setForm] = useState<Partial<Municipality>>(emptyForm)
  const [adminUser, setAdminUser] = useState<AdminUserForm>(emptyAdminUser)

  const load = async () => {
    setLoading(true)
    try {
      const data = await apiClient.get("/municipalities")
      const list = data.municipalities || data.data?.municipalities || []
      setItems(list)
    } catch (error: any) {
      toast.error(error.message || "فشل تحميل البلديات")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm })
    setAdminUser({ ...emptyAdminUser })
    setOpen(true)
  }

  const openEdit = (item: Municipality) => {
    setEditing(item)
    setForm({
      ...item,
      atharKey: item.atharKey || "",
    })
    setAdminUser({ ...emptyAdminUser })
    setOpen(true)
  }

  const submit = async () => {
    if (!form.name || !form.governorate) {
      toast.error("الاسم والمحافظة مطلوبة")
      return
    }
    try {
      if (editing) {
        await apiClient.patch(`/municipalities/${editing._id}`, form)
        toast.success("تم تحديث البلدية")
      } else {
        if (!adminUser.adminUserName || !adminUser.adminUserEmail || !adminUser.adminUserPassword) {
          toast.error("بيانات مستخدم البلدية مطلوبة")
          return
        }
        await apiClient.post("/municipalities", {
          ...form,
          ...adminUser,
        })
        toast.success("تم إنشاء البلدية")
      }
      setOpen(false)
      await load()
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const remove = async (item: Municipality) => {
    if (!confirm(`حذف البلدية ${item.name}?`)) return
    try {
      await apiClient.delete(`/municipalities/${item._id}`)
      setItems((prev) => prev.filter((i) => i._id !== item._id))
      toast.success("تم حذف البلدية")
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  return (
    <Card className="text-right">
      <CardHeader>
        <div className="flex items-center justify-between flex-row-reverse">
          <CardTitle>البلديات</CardTitle>
          <Button onClick={openCreate}>إضافة بلدية</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">جاري التحميل...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-right">
                  <th className="p-2">الاسم</th>
                  <th className="p-2">المحافظة</th>
                  <th className="p-2">المنطقة</th>
                  <th className="p-2">التوقيت</th>
                  <th className="p-2">الحالة</th>
                  <th className="p-2">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className="border-b">
                    <td className="p-2">{item.name}</td>
                    <td className="p-2">{item.governorate}</td>
                    <td className="p-2">{item.areaName || "-"}</td>
                    <td className="p-2">{item.timezone || "Asia/Damascus"}</td>
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
                      لا توجد بلديات بعد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="text-right">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل بلدية" : "إضافة بلدية"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>اسم البلدية</Label>
              <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>اسم عربي</Label>
              <Input value={form.nameAr || ""} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
            </div>
            <div>
              <Label>المحافظة</Label>
              <Input value={form.governorate || ""} onChange={(e) => setForm({ ...form, governorate: e.target.value })} />
            </div>
            <div>
              <Label>المنطقة</Label>
              <Input value={form.areaName || ""} onChange={(e) => setForm({ ...form, areaName: e.target.value })} />
            </div>
            <div>
              <Label>العنوان</Label>
              <Input value={form.addressText || ""} onChange={(e) => setForm({ ...form, addressText: e.target.value })} />
            </div>
            <div>
              <Label className="mb-2 block">تحديد الموقع على الخريطة</Label>
              <MapPicker
                lat={form.centerLat ?? 0}
                lng={form.centerLng ?? 0}
                onSelect={(lat, lng) => setForm((f) => ({ ...f, centerLat: lat, centerLng: lng }))}
                height="260px"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>خط العرض (Lat)</Label>
                <Input type="number" step="any" value={form.centerLat ?? 0} onChange={(e) => setForm({ ...form, centerLat: Number(e.target.value) })} />
              </div>
              <div>
                <Label>خط الطول (Lng)</Label>
                <Input type="number" step="any" value={form.centerLng ?? 0} onChange={(e) => setForm({ ...form, centerLng: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>المنطقة الزمنية</Label>
              <Input value={form.timezone || "Asia/Damascus"} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
            </div>
            <div>
              <Label>Athar Key</Label>
              <Input value={form.atharKey || ""} onChange={(e) => setForm({ ...form, atharKey: e.target.value })} />
            </div>
            {!editing && (
              <>
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground mb-2">مستخدم البلدية</div>
                </div>
                <div>
                  <Label>اسم المستخدم</Label>
                  <Input value={adminUser.adminUserName} onChange={(e) => setAdminUser({ ...adminUser, adminUserName: e.target.value })} />
                </div>
                <div>
                  <Label>البريد الإلكتروني</Label>
                  <Input type="email" value={adminUser.adminUserEmail} onChange={(e) => setAdminUser({ ...adminUser, adminUserEmail: e.target.value })} />
                </div>
                <div>
                  <Label>كلمة المرور</Label>
                  <Input type="password" value={adminUser.adminUserPassword} onChange={(e) => setAdminUser({ ...adminUser, adminUserPassword: e.target.value })} />
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
            <Button onClick={submit}>{editing ? "تحديث" : "إضافة"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
