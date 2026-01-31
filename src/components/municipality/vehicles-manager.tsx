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

type Vehicle = {
  _id: string
  name: string
  plateNumber?: string
  imei: string
  driverId?: string
  routeId?: string
  isActive: boolean
}

type Driver = { _id: string; name: string }
type Route = { _id: string; name: string }

const emptyForm: Partial<Vehicle> = {
  name: "",
  plateNumber: "",
  imei: "",
  driverId: "",
  routeId: "",
  isActive: true,
}

export function VehiclesManager() {
  const [items, setItems] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [form, setForm] = useState<Partial<Vehicle>>(emptyForm)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [vehiclesRes, driversRes, routesRes] = await Promise.all([
        apiClient.get("/vehicles"),
        apiClient.get("/drivers"),
        apiClient.get("/routes"),
      ])
      setItems(vehiclesRes.vehicles || vehiclesRes.data?.vehicles || [])
      setDrivers(driversRes.drivers || driversRes.data?.drivers || [])
      setRoutes(routesRes.routes || routesRes.data?.routes || [])
    } catch (error: any) {
      toast.error(error.message || "فشل تحميل الشاحنات والمركبات")
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

  const openEdit = (item: Vehicle) => {
    setEditing(item)
    setForm({
      ...item,
      plateNumber: item.plateNumber || "",
      driverId: item.driverId || "",
      routeId: item.routeId || "",
    })
    setOpen(true)
  }

  const submit = async () => {
    if (!form.name || !form.imei) {
      toast.error("الاسم و IMEI مطلوبان")
      return
    }
    const payload = {
      ...form,
      driverId: form.driverId || undefined,
      routeId: form.routeId || undefined,
    }
    try {
      if (editing) {
        await apiClient.patch(`/vehicles/${editing._id}`, payload)
        toast.success("تم تحديث الشاحنة/المركبة")
      } else {
        await apiClient.post("/vehicles", payload)
        toast.success("تم إضافة الشاحنة/المركبة")
      }
      setOpen(false)
      await load()
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const remove = async (item: Vehicle) => {
    if (!confirm(`حذف الشاحنة/المركبة ${item.name}?`)) return
    try {
      await apiClient.delete(`/vehicles/${item._id}`)
      setItems((prev) => prev.filter((i) => i._id !== item._id))
      toast.success("تم حذف الشاحنة/المركبة")
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  return (
    <Card className="text-right">
      <CardHeader>
        <div className="flex items-center justify-between flex-row-reverse">
          <CardTitle>الشاحنات والمركبات</CardTitle>
          <Button onClick={openCreate}>إضافة شاحنة/مركبة</Button>
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
                  <th className="p-2">اللوحة</th>
                  <th className="p-2">IMEI</th>
                  <th className="p-2">الحالة</th>
                  <th className="p-2">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className="border-b">
                    <td className="p-2">{item.name}</td>
                    <td className="p-2">{item.plateNumber || "-"}</td>
                    <td className="p-2">{item.imei}</td>
                    <td className="p-2">{item.isActive ? "مفعلة" : "معطلة"}</td>
                    <td className="p-2 space-x-2 space-x-reverse">
                      <Button variant="outline" onClick={() => openEdit(item)}>تعديل</Button>
                      <Button variant="destructive" onClick={() => remove(item)}>حذف</Button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-muted-foreground" colSpan={5}>
                      لا توجد شاحنات أو مركبات
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
            <DialogTitle>{editing ? "تعديل شاحنة/مركبة" : "إضافة شاحنة/مركبة"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>الاسم</Label>
              <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>رقم اللوحة</Label>
              <Input value={form.plateNumber || ""} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} />
            </div>
            <div>
              <Label>IMEI</Label>
              <Input value={form.imei || ""} onChange={(e) => setForm({ ...form, imei: e.target.value })} />
            </div>
            <div>
              <Label>السائق</Label>
              <Select value={form.driverId || ""} onValueChange={(value) => setForm({ ...form, driverId: value })}>
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="اختيار سائق (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver._id} value={driver._id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>المسار</Label>
              <Select value={form.routeId || ""} onValueChange={(value) => setForm({ ...form, routeId: value })}>
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="اختيار مسار (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((route) => (
                    <SelectItem key={route._id} value={route._id}>
                      {route.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
