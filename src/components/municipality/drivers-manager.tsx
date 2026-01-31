"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import toast from "react-hot-toast"

type Driver = {
  _id: string
  name: string
  phone?: string
  nationalId?: string
  assignedVehicleId?: string
  isActive: boolean
}

type Vehicle = { _id: string; name: string }

const emptyForm: Partial<Driver> = {
  name: "",
  phone: "",
  nationalId: "",
  assignedVehicleId: "",
  isActive: true,
}

export function DriversManager() {
  const [items, setItems] = useState<Driver[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Driver | null>(null)
  const [form, setForm] = useState<Partial<Driver>>(emptyForm)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [driversRes, vehiclesRes] = await Promise.all([
        apiClient.get("/drivers"),
        apiClient.get("/vehicles"),
      ])
      setItems(driversRes.drivers || driversRes.data?.drivers || [])
      setVehicles(vehiclesRes.vehicles || vehiclesRes.data?.vehicles || [])
    } catch (error: any) {
      toast.error(error.message || "فشل تحميل السائقين")
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
    setOpen(true)
  }

  const openEdit = (item: Driver) => {
    setEditing(item)
    setForm({
      ...item,
      phone: item.phone || "",
      nationalId: item.nationalId || "",
      assignedVehicleId: item.assignedVehicleId || "",
    })
    setOpen(true)
  }

  const submit = async () => {
    if (!form.name) {
      toast.error("اسم السائق مطلوب")
      return
    }
    const payload = {
      ...form,
      assignedVehicleId: form.assignedVehicleId || undefined,
    }
    try {
      if (editing) {
        await apiClient.patch(`/drivers/${editing._id}`, payload)
        toast.success("تم تحديث السائق")
      } else {
        await apiClient.post("/drivers", payload)
        toast.success("تم إضافة السائق")
      }
      setOpen(false)
      await load()
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const remove = async (item: Driver) => {
    if (!confirm(`حذف السائق ${item.name}?`)) return
    try {
      await apiClient.delete(`/drivers/${item._id}`)
      setItems((prev) => prev.filter((i) => i._id !== item._id))
      toast.success("تم حذف السائق")
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  return (
    <Card className="text-right">
      <CardHeader>
        <div className="flex items-center justify-between flex-row-reverse">
          <CardTitle>السائقون</CardTitle>
          <Button onClick={openCreate}>إضافة سائق</Button>
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
                  <th className="p-2">الهاتف</th>
                  <th className="p-2">الشاحنة/المركبة</th>
                  <th className="p-2">الحالة</th>
                  <th className="p-2">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className="border-b">
                    <td className="p-2">{item.name}</td>
                    <td className="p-2">{item.phone || "-"}</td>
                    <td className="p-2">
                      {vehicles.find((v) => v._id === item.assignedVehicleId)?.name || "-"}
                    </td>
                    <td className="p-2">{item.isActive ? "مفعل" : "معطل"}</td>
                    <td className="p-2 space-x-2 space-x-reverse">
                      <Button variant="outline" onClick={() => openEdit(item)}>تعديل</Button>
                      <Button variant="destructive" onClick={() => remove(item)}>حذف</Button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-muted-foreground" colSpan={5}>
                      لا يوجد سائقون
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
            <DialogTitle>{editing ? "تعديل سائق" : "إضافة سائق"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>الاسم</Label>
              <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>الهاتف</Label>
              <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>الرقم الوطني</Label>
              <Input value={form.nationalId || ""} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
            </div>
            <div>
              <Label>الشاحنة/المركبة</Label>
              <Select value={form.assignedVehicleId || ""} onValueChange={(value) => setForm({ ...form, assignedVehicleId: value })}>
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="اختيار شاحنة/مركبة (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle._id} value={vehicle._id}>
                      {vehicle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between border rounded-lg p-2">
              <span>مفعل</span>
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
