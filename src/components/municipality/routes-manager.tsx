"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { apiClient } from "@/lib/api/client"
import { useLabels } from "@/hooks/use-labels"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ExportExcelDialog, type ExportColumn } from "@/components/municipality/export-excel-dialog"

const RoutePreviewMap = dynamic(
  () => import("@/components/municipality/route-preview-map").then((m) => m.RoutePreviewMap),
  { ssr: false }
)

type RouteItem = {
  _id: string
  name: string
  description?: string
  isActive: boolean
}

type PointItem = {
  _id: string
  name: string
  nameAr?: string
  lat: number
  lng: number
}

type RoutePointItem = {
  pointId: string
  order: number
}

type PreviewResponse = {
  geometry: {
    type: "LineString"
    coordinates: number[][]
  }
  source: "osrm" | "fallback"
  points: PointItem[]
}

const PAGE_SIZE = 10

const emptyForm: Partial<RouteItem> = {
  name: "",
  description: "",
  isActive: true,
}

export function RoutesManager() {
  const { labels } = useLabels()

  const [items, setItems] = useState<RouteItem[]>([])
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<RouteItem | null>(null)
  const [form, setForm] = useState<Partial<RouteItem>>(emptyForm)

  const [points, setPoints] = useState<PointItem[]>([])
  const [pointsLoading, setPointsLoading] = useState(false)
  const [pointSearch, setPointSearch] = useState("")
  const [routePoints, setRoutePoints] = useState<RoutePointItem[]>([])

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null)

  const pointMap = useMemo(() => new Map(points.map((p) => [p._id, p])), [points])

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

  const loadPoints = async () => {
    setPointsLoading(true)
    try {
      const res: any = await apiClient.get("/points")
      setPoints(res.points || res.data?.points || [])
    } catch (error: any) {
      toast.error(error.message || `فشل تحميل ${labels.pointLabel}`)
    } finally {
      setPointsLoading(false)
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

  const selectedPointIds = useMemo(() => new Set(routePoints.map((rp) => rp.pointId)), [routePoints])

  const availablePoints = useMemo(() => {
    const q = pointSearch.trim().toLowerCase()
    return points.filter((point) => {
      if (selectedPointIds.has(point._id)) return false
      if (!q) return true
      return `${point.name} ${point.nameAr || ""}`.toLowerCase().includes(q)
    })
  }, [points, selectedPointIds, pointSearch])

  const orderedRoutePoints = useMemo(
    () => routePoints.slice().sort((a, b) => a.order - b.order),
    [routePoints]
  )

  const openCreate = async () => {
    setEditing(null)
    setForm({ ...emptyForm })
    setRoutePoints([])
    setPointSearch("")
    setPreviewData(null)
    setPreviewOpen(false)
    setOpen(true)
    await loadPoints()
  }

  const openEdit = async (item: RouteItem) => {
    setEditing(item)
    setForm({
      ...item,
      description: item.description || "",
    })
    setRoutePoints([])
    setPointSearch("")
    setPreviewData(null)
    setPreviewOpen(false)
    setOpen(true)

    await Promise.all([
      loadPoints(),
      (async () => {
        try {
          const res: any = await apiClient.get(`/routes/${item._id}/points`)
          const list = (res.routePoints || res.data?.routePoints || []) as RoutePointItem[]
          const sorted = list.slice().sort((a, b) => a.order - b.order)
          setRoutePoints(sorted.map((rp, index) => ({ pointId: rp.pointId, order: index })))
        } catch (error: any) {
          toast.error(error.message || `فشل تحميل ${labels.pointLabel} للمسار`)
        }
      })(),
    ])
  }

  const addPointToRoute = (pointId: string) => {
    if (routePoints.some((rp) => rp.pointId === pointId)) return
    setRoutePoints((prev) => [...prev, { pointId, order: prev.length }])
  }

  const removePointFromRoute = (pointId: string) => {
    setRoutePoints((prev) =>
      prev
        .filter((rp) => rp.pointId !== pointId)
        .map((rp, index) => ({ ...rp, order: index }))
    )
  }

  const movePoint = (pointId: string, direction: "up" | "down") => {
    setRoutePoints((prev) => {
      const sorted = prev.slice().sort((a, b) => a.order - b.order)
      const index = sorted.findIndex((rp) => rp.pointId === pointId)
      if (index < 0) return prev

      const target = direction === "up" ? index - 1 : index + 1
      if (target < 0 || target >= sorted.length) return prev

      const temp = sorted[index]
      sorted[index] = sorted[target]
      sorted[target] = temp

      return sorted.map((rp, idx) => ({ ...rp, order: idx }))
    })
  }

  const openPreviewByPointIds = async (pointIds: string[]) => {
    if (pointIds.length < 2) {
      toast.error(`\u064a\u062c\u0628 \u0627\u062e\u062a\u064a\u0627\u0631 \u0646\u0642\u0637\u062a\u064a\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0636\u0645\u0646 ${labels.pointLabel}`)
      return
    }

    setPreviewLoading(true)
    setPreviewOpen(true)
    try {
      const res: any = await apiClient.post("/routes/preview", { pointIds })
      const data = (res.data || res) as PreviewResponse
      setPreviewData(data)
      if (data.source === "fallback") {
        toast("\u062a\u0645 \u0639\u0631\u0636 \u062e\u0637 \u0645\u0628\u0627\u0634\u0631 \u0644\u0623\u0646 \u062a\u0648\u0644\u064a\u062f \u0627\u0644\u0645\u0633\u0627\u0631 \u0639\u0644\u0649 \u0627\u0644\u0637\u0631\u0642 \u0644\u0645 \u064a\u0646\u062c\u062d \u062d\u0627\u0644\u064a\u0627\u064b")
      }
    } catch (error: any) {
      setPreviewData(null)
      toast.error(error.message || "\u0641\u0634\u0644 \u062a\u0648\u0644\u064a\u062f \u0645\u0639\u0627\u064a\u0646\u0629 \u0627\u0644\u0645\u0633\u0627\u0631")
    } finally {
      setPreviewLoading(false)
    }
  }

  const openPreviewForRoute = async (routeId: string) => {
    try {
      const res: any = await apiClient.get(`/routes/${routeId}/points`)
      const list = (res.routePoints || res.data?.routePoints || []) as RoutePointItem[]
      const pointIds = list
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((rp) => rp.pointId)
      await openPreviewByPointIds(pointIds)
    } catch (error: any) {
      toast.error(error.message || "\u0641\u0634\u0644 \u062a\u062d\u0645\u064a\u0644 \u0646\u0642\u0627\u0637 \u0627\u0644\u0645\u0633\u0627\u0631")
    }
  }

  const submit = async () => {
    if (!form.name) {
      toast.error(`اسم ${labels.routeLabel} مطلوب`)
      return
    }

    if (routePoints.length < 2) {
      toast.error(`يجب اختيار نقطتين على الأقل ضمن ${labels.pointLabel}`)
      return
    }

    try {
      if (editing) {
        await apiClient.patch(`/routes/${editing._id}`, form)
        await apiClient.post(`/routes/${editing._id}/points`, { points: routePoints })
        toast.success(`تم تحديث ${labels.routeLabel}`)
      } else {
        const createRes: any = await apiClient.post("/routes", form)
        const createdRoute = createRes.route || createRes.data?.route
        const routeId = createdRoute?._id
        if (!routeId) {
          throw new Error("تعذر الحصول على معرف المسار بعد الإنشاء")
        }
        await apiClient.post(`/routes/${routeId}/points`, { points: routePoints })
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

  const exportColumns: ExportColumn<RouteItem>[] = useMemo(
    () => [
      { key: "name", label: "الاسم", value: (row) => row.name },
      { key: "description", label: "الوصف", value: (row) => row.description || "-" },
      { key: "status", label: "الحالة", value: (row) => (row.isActive ? "مفعل" : "معطل") },
    ],
    []
  )

  return (
    <Card className="text-right">
      <CardHeader>
        <div className="flex items-center justify-between flex-row-reverse">
          <CardTitle>{labels.routeLabel}</CardTitle>
          <div className="flex items-center gap-2">
            <ExportExcelDialog
              title={`Export ${labels.routeLabel} to Excel`}
              rows={filteredItems}
              columns={exportColumns}
              fileBaseName="routes"
            />
            <Button onClick={openCreate}>إضافة {labels.routeLabel}</Button>
          </div>
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
                  <th className="p-2">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => (
                  <tr key={item._id} className="border-b">
                    <td className="p-2">{item.name}</td>
                    <td className="p-2">{item.description || "-"}</td>
                    <td className="p-2">{item.isActive ? "مفعّل" : "معطّل"}</td>
                    <td className="p-2 space-x-2 space-x-reverse">
                      <Button variant="outline" onClick={() => openPreviewForRoute(item._id)}>{"\u0639\u0631\u0636 \u0627\u0644\u0645\u0633\u0627\u0631"}</Button>
                      <Button variant="outline" onClick={() => openEdit(item)}>{"\u062a\u0639\u062f\u064a\u0644"}</Button>
                      <Button variant="destructive" onClick={() => remove(item)}>{"\u062d\u0630\u0641"}</Button>
                    </td>
                  </tr>
                ))}
                {paginatedItems.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-muted-foreground" colSpan={4}>
                      لا توجد نتائج
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border rounded-lg p-2">
          <span className="text-sm text-muted-foreground">صفحة {page} من {totalPages}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>التالي</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>السابق</Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="text-right w-[95vw] max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `تعديل ${labels.routeLabel}` : `إضافة ${labels.routeLabel}`}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>الاسم</Label>
                <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>الوصف</Label>
                <Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="border rounded-lg p-3 space-y-3">
                <div className="font-medium">النقاط المتاحة</div>
                <Input
                  placeholder={`بحث في ${labels.pointLabel}...`}
                  value={pointSearch}
                  onChange={(e) => setPointSearch(e.target.value)}
                />

                {pointsLoading ? (
                  <div className="text-sm text-muted-foreground">جاري تحميل {labels.pointLabel}...</div>
                ) : (
                  <div className="max-h-[320px] overflow-y-auto border rounded-lg">
                    {availablePoints.map((point) => (
                      <div key={point._id} className="flex items-center justify-between p-2 border-b last:border-b-0">
                        <span className="text-sm">{point.nameAr || point.name}</span>
                        <Button type="button" size="sm" variant="outline" onClick={() => addPointToRoute(point._id)}>
                          إضافة
                        </Button>
                      </div>
                    ))}
                    {availablePoints.length === 0 && (
                      <div className="p-3 text-sm text-muted-foreground">لا توجد نقاط مطابقة.</div>
                    )}
                  </div>
                )}
              </div>

              <div className="border rounded-lg p-3 space-y-3">
                <div className="font-medium">تسلسل المسار ({orderedRoutePoints.length})</div>
                <div className="max-h-[320px] overflow-y-auto space-y-2">
                  {orderedRoutePoints.map((rp, index) => (
                    <div key={rp.pointId} className="flex items-center justify-between border rounded-lg p-2">
                      <div className="text-sm font-medium">
                        {index + 1}. {pointMap.get(rp.pointId)?.nameAr || pointMap.get(rp.pointId)?.name || rp.pointId}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => movePoint(rp.pointId, "up")} disabled={index === 0}>↑</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => movePoint(rp.pointId, "down")} disabled={index === orderedRoutePoints.length - 1}>↓</Button>
                        <Button type="button" size="sm" variant="destructive" onClick={() => removePointFromRoute(rp.pointId)}>إزالة</Button>
                      </div>
                    </div>
                  ))}
                  {orderedRoutePoints.length === 0 && (
                    <div className="text-sm text-muted-foreground">لم يتم اختيار نقاط بعد.</div>
                  )}
                </div>
              </div>
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

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="text-right w-[95vw] max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>معاينة المسار على الخريطة</DialogTitle>
          </DialogHeader>

          {previewLoading ? (
            <div className="text-sm text-muted-foreground">جاري توليد المسار...</div>
          ) : previewData ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                مصدر المسار: {previewData.source === "osrm" ? "حسب الطرق" : "خط مباشر"}
              </div>
              <RoutePreviewMap points={previewData.points} geometry={previewData.geometry} />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">لا توجد بيانات للمعاينة.</div>
          )}

          <DialogFooter className="flex-row-reverse">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
