"use client"

import { useEffect, useMemo, useState } from "react"
import { apiClient } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import toast from "react-hot-toast"
import Link from "next/link"
import { useLabels } from "@/hooks/use-labels"

type RouteItem = {
  _id: string
  name: string
  description?: string
  isActive: boolean
}

const emptyForm: Partial<RouteItem> = {
  name: "",
  description: "",
  isActive: true,
}

export function RoutesManager() {
  const PAGE_SIZE = 10

  const [items, setItems] = useState<RouteItem[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<RouteItem | null>(null)
  const [form, setForm] = useState<Partial<RouteItem>>(emptyForm)
  const [loading, setLoading] = useState(false)
  const { labels } = useLabels()

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get("/routes")
      setItems(res.routes || res.data?.routes || [])
    } catch (error: any) {
      toast.error(error.message || `فشل تحميل ${labels.routeLabel}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      if (statusFilter === "active" && !item.isActive) return false
      if (statusFilter === "inactive" && item.isActive) return false
      if (!q) return true
      return `${item.name} ${item.description || ""}`.toLowerCase().includes(q)
    })
  }, [items, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredItems.slice(start, start + PAGE_SIZE)
  }, [filteredItems, page])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm })
    setOpen(true)
  }

  const openEdit = (item: RouteItem) => {
    setEditing(item)
    setForm({
      ...item,
      description: item.description || "",
    })
    setOpen(true)
  }

  const submit = async () => {
    if (!form.name) {
      toast.error(`اسم ${labels.routeLabel} مطلوب`)
      return
    }
    try {
      if (editing) {
        await apiClient.patch(`/routes/${editing._id}`, form)
        toast.success(`تم تحديث ${labels.routeLabel}`)
      } else {
        await apiClient.post("/routes", form)
        toast.success(`تم إضافة ${labels.routeLabel}`)
      }
      setOpen(false)
      await load()
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const remove = async (item: RouteItem) => {
    if (!confirm(`حذف ${labels.routeLabel} ${item.name}؟`)) return
    try {
      await apiClient.delete(`/routes/${item._id}`)
      setItems((prev) => prev.filter((i) => i._id !== item._id))
      toast.success(`تم حذف ${labels.routeLabel}`)
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  return (
    <Card className="text-right">
      <CardHeader>
        <div className="flex items-center justify-between flex-row-reverse">
          <CardTitle>{labels.routeLabel}</CardTitle>
          <Button onClick={openCreate}>إضافة {labels.routeLabel}</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder={`بحث في ${labels.routeLabel}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="text-right"><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="active">مفعّل</SelectItem>
              <SelectItem value="inactive">معطّل</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">جاري التحميل...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-right">
                  <th className="p-2">الاسم</th>
                  <th className="p-2">الوصف</th>
                  <th className="p-2">الحالة</th>
                  <th className="p-2">{labels.pointLabel}</th>
                  <th className="p-2">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => (
                  <tr key={item._id} className="border-b">
                    <td className="p-2">{item.name}</td>
                    <td className="p-2">{item.description || "-"}</td>
                    <td className="p-2">{item.isActive ? "مفعّل" : "معطّل"}</td>
                    <td className="p-2">
                      <Link className="text-primary underline" href={`/dashboard/routes/${item._id}/points`}>
                        ضبط {labels.pointLabel}
                      </Link>
                    </td>
                    <td className="p-2 space-x-2 space-x-reverse">
                      <Button variant="outline" onClick={() => openEdit(item)}>تعديل</Button>
                      <Button variant="destructive" onClick={() => remove(item)}>حذف</Button>
                    </td>
                  </tr>
                ))}
                {paginatedItems.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-muted-foreground" colSpan={5}>
                      لا توجد نتائج
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border rounded-lg p-2">
          <span className="text-sm text-muted-foreground">
            صفحة {page} من {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
              التالي
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
              السابق
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="text-right">
          <DialogHeader>
            <DialogTitle>{editing ? `تعديل ${labels.routeLabel}` : `إضافة ${labels.routeLabel}`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>الاسم</Label>
              <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>الوصف</Label>
              <Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex items-center justify-between border rounded-lg p-2">
              <span>مفعّل</span>
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
