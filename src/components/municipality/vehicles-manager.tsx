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
import { useLabels } from "@/hooks/use-labels"

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

type RouteItem = { _id: string; name: string }

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
  const [routes, setRoutes] = useState<RouteItem[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [form, setForm] = useState<Partial<Vehicle>>(emptyForm)
  const [loading, setLoading] = useState(false)
  const { labels } = useLabels()

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
      toast.error(error.message || `فشل تحميل ${labels.vehicleLabel}`)
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
      toast.error("الاسم ورقم IMEI مطلوبان")
      return
    }
    try {
      if (editing) {
        await apiClient.patch(`/vehicles/${editing._id}`, form)
        toast.success(`تم تحديث ${labels.vehicleLabel}`)
      } else {
        await apiClient.post("/vehicles", form)
        toast.success(`تم إضافة ${labels.vehicleLabel}`)
      }
      setOpen(false)
      await load()
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const remove = async (item: Vehicle) => {
    if (!confirm(`حذف ${labels.vehicleLabel} ${item.name}?`)) return
    try {
      await apiClient.delete(`/vehicles/${item._id}`)
      setItems((prev) => prev.filter((i) => i._id !== item._id))
      toast.success(`تم حذف ${labels.vehicleLabel}`)
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  return (
    <Card className="text-right">
      <CardHeader>
        <div className="flex items-center justify-between flex-row-reverse">
          <CardTitle>{labels.vehicleLabel}</CardTitle>
          <Button onClick={openCreate}>إضافة {labels.vehicleLabel}</Button>
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
                  <th className="p-2">اسم {labels.vehicleLabel}</th>
                  <th className="p-2">رقم اللوحة</th>
                  <th className="p-2">رقم IMEI</th>
                  <th className="p-2">{labels.driverLabel}</th>
                  <th className="p-2">{labels.routeLabel}</th>
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
                    <td className="p-2">
                      {drivers.find((d) => d._id === item.driverId)?.name || "-"}
                    </td>
                    <td className="p-2">
                      {routes.find((r) => r._id === item.routeId)?.name || "-"}
                    </td>
                    <td className="p-2">{item.isActive ? "مفعلة" : "معطلة"}</td>
                    <td className="p-2 space-x-2 space-x-reverse">
                      <Button variant="outline" onClick={() => openEdit(item)}>تعديل</Button>
                      <Button variant="destructive" onClick={() => remove(item)}>حذف</Button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-muted-foreground" colSpan={7}>
                      لا توجد {labels.vehicleLabel}
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
            <DialogTitle>{editing ? `تعديل ${labels.vehicleLabel}` : `إضافة ${labels.vehicleLabel}`}</DialogTitle>
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
              <Label>رقم IMEI</Label>
              <Input value={form.imei || ""} onChange={(e) => setForm({ ...form, imei: e.target.value })} />
            </div>
            <div>
              <Label>{labels.driverLabel}</Label>
              <Select value={form.driverId || ""} onValueChange={(value) => setForm({ ...form, driverId: value })}>
                <SelectTrigger className="text-right">
                  <SelectValue placeholder={`اختيار ${labels.driverLabel}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">بدون</SelectItem>
                  {drivers.map((driver) => (
                    <SelectItem key={driver._id} value={driver._id}>{driver.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{labels.routeLabel}</Label>
              <Select value={form.routeId || ""} onValueChange={(value) => setForm({ ...form, routeId: value })}>
                <SelectTrigger className="text-right">
                  <SelectValue placeholder={`اختيار ${labels.routeLabel}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">بدون</SelectItem>
                  {routes.map((route) => (
                    <SelectItem key={route._id} value={route._id}>{route.name}</SelectItem>
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

