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

type Point = {
  _id: string
  name: string
  nameAr?: string
  nameEn?: string
  type: string
  lat: number
  lng: number
  radiusMeters: number
  addressText?: string
  isActive: boolean
}

const emptyForm: Partial<Point> = {
  name: "",
  nameAr: "",
  nameEn: "",
  type: "container",
  lat: 0,
  lng: 0,
  radiusMeters: 500,
  addressText: "",
  isActive: true,
}

export function PointsManager() {
  const [items, setItems] = useState<Point[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Point | null>(null)
  const [form, setForm] = useState<Partial<Point>>(emptyForm)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get("/points")
      setItems(res.points || res.data?.points || [])
    } catch (error: any) {
      toast.error(error.message || "فشل تحميل الحاويات")
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

  const openEdit = (item: Point) => {
    setEditing(item)
    setForm({
      ...item,
      nameAr: item.nameAr || "",
      nameEn: item.nameEn || "",
      addressText: item.addressText || "",
    })
    setOpen(true)
  }

  const submit = async () => {
    if (!form.name || form.lat === undefined || form.lng === undefined) {
      toast.error("الاسم والإحداثيات مطلوبة")
      return
    }
    try {
      if (editing) {
        await apiClient.patch(`/points/${editing._id}`, form)
        toast.success("تم تحديث الحاوية")
      } else {
        await apiClient.post("/points", form)
        toast.success("تم إضافة الحاوية")
      }
      setOpen(false)
      await load()
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const remove = async (item: Point) => {
    if (!confirm(`حذف الحاوية ${item.name}?`)) return
    try {
      await apiClient.delete(`/points/${item._id}`)
      setItems((prev) => prev.filter((i) => i._id !== item._id))
      toast.success("تم حذف الحاوية")
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  return (
    <Card className="text-right">
      <CardHeader>
        <div className="flex items-center justify-between flex-row-reverse">
          <CardTitle>الحاويات</CardTitle>
          <Button onClick={openCreate}>إضافة حاوية</Button>
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
                  <th className="p-2">اسم الحاوية</th>
                  <th className="p-2">النوع</th>
                  <th className="p-2">Lat</th>
                  <th className="p-2">Lng</th>
                  <th className="p-2">نصف القطر</th>
                  <th className="p-2">الحالة</th>
                  <th className="p-2">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className="border-b">
                    <td className="p-2">{item.nameAr || item.name}</td>
                    <td className="p-2">{item.type}</td>
                    <td className="p-2">{item.lat}</td>
                    <td className="p-2">{item.lng}</td>
                    <td className="p-2">{item.radiusMeters}</td>
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
                      لا توجد حاويات
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
            <DialogTitle>{editing ? "تعديل حاوية" : "إضافة حاوية"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>الاسم</Label>
              <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>الاسم العربي</Label>
              <Input value={form.nameAr || ""} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
            </div>
            <div>
              <Label>الاسم الانجليزي</Label>
              <Input value={form.nameEn || ""} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
            </div>
            <div>
              <Label>النوع</Label>
              <Select value={form.type || "container"} onValueChange={(value) => setForm({ ...form, type: value })}>
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="اختيار النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="container">حاوية</SelectItem>
                  <SelectItem value="station">محطة</SelectItem>
                  <SelectItem value="facility">منشأة</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Lat</Label>
                <Input type="number" value={form.lat ?? 0} onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Lng</Label>
                <Input type="number" value={form.lng ?? 0} onChange={(e) => setForm({ ...form, lng: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>نصف القطر (متر)</Label>
              <Input type="number" value={form.radiusMeters ?? 500} onChange={(e) => setForm({ ...form, radiusMeters: Number(e.target.value) })} />
            </div>
            <div>
              <Label>العنوان</Label>
              <Input value={form.addressText || ""} onChange={(e) => setForm({ ...form, addressText: e.target.value })} />
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
