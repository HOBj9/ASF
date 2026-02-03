"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useState } from "react"
import { apiClient } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import toast from "react-hot-toast"
import { useLabels } from "@/hooks/use-labels"
import { ExportExcelDialog, type ExportColumn } from "@/components/municipality/export-excel-dialog"

const MapPicker = dynamic(() => import("@/components/ui/map-picker").then((m) => m.MapPicker), { ssr: false })

type Point = {
  _id: string
  name: string
  nameAr?: string
  nameEn?: string
  type: string
  lat: number
  lng: number
  radiusMeters: number
  zoneId?: string
  addressText?: string
  isActive: boolean
}

type AtharMarker = {
  id: string
  lat: number
  lng: number
  name?: string
}

type AtharZone = {
  id: string
  name: string
  color?: string
  center: { lat: number; lng: number } | null
  vertices: Array<{ lat: number; lng: number }>
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

const pointTypeLabels: Record<string, string> = {
  container: "حاوية",
  station: "محطة",
  facility: "منشأة",
  other: "أخرى",
}

export function PointsManager() {
  const PAGE_SIZE = 10

  const [activeTab, setActiveTab] = useState("local")

  const [localPoints, setLocalPoints] = useState<Point[]>([])
  const [markers, setMarkers] = useState<AtharMarker[]>([])
  const [zones, setZones] = useState<AtharZone[]>([])

  const [loadingLocal, setLoadingLocal] = useState(false)
  const [loadingMarkers, setLoadingMarkers] = useState(false)
  const [loadingZones, setLoadingZones] = useState(false)

  const [markersLoaded, setMarkersLoaded] = useState(false)
  const [zonesLoaded, setZonesLoaded] = useState(false)

  const [localSearch, setLocalSearch] = useState("")
  const [localStatusFilter, setLocalStatusFilter] = useState("all")
  const [localTypeFilter, setLocalTypeFilter] = useState("all")
  const [localPage, setLocalPage] = useState(1)

  const [markersSearch, setMarkersSearch] = useState("")
  const [markersPage, setMarkersPage] = useState(1)

  const [zonesSearch, setZonesSearch] = useState("")
  const [zonesColorFilter, setZonesColorFilter] = useState("all")
  const [zonesPage, setZonesPage] = useState(1)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Point | null>(null)
  const [form, setForm] = useState<Partial<Point>>(emptyForm)

  const { labels } = useLabels()

  const loadLocalPoints = async () => {
    setLoadingLocal(true)
    try {
      const res: any = await apiClient.get("/points")
      setLocalPoints(res.points || res.data?.points || [])
    } catch (error: any) {
      toast.error(error.message || `فشل تحميل ${labels.pointLabel}`)
    } finally {
      setLoadingLocal(false)
    }
  }

  const loadAtharMarkers = async () => {
    setLoadingMarkers(true)
    try {
      const res: any = await apiClient.get("/athar/markers")
      setMarkers(res.markers || res.data?.markers || [])
      setMarkersLoaded(true)
    } catch (error: any) {
      toast.error(error.message || "فشل تحميل العلامات من أثر")
    } finally {
      setLoadingMarkers(false)
    }
  }

  const loadAtharZones = async () => {
    setLoadingZones(true)
    try {
      const res: any = await apiClient.get("/athar/zones?sync=false")
      setZones(res.zones || res.data?.zones || [])
      setZonesLoaded(true)
    } catch (error: any) {
      toast.error(error.message || "فشل تحميل المناطق من أثر")
    } finally {
      setLoadingZones(false)
    }
  }

  useEffect(() => {
    loadLocalPoints()
  }, [])

  const onTabChange = (value: string) => {
    setActiveTab(value)
    if (value === "markers" && !markersLoaded && !loadingMarkers) {
      loadAtharMarkers()
    }
    if (value === "zones" && !zonesLoaded && !loadingZones) {
      loadAtharZones()
    }
  }

  const filteredLocalPoints = useMemo(() => {
    const q = localSearch.trim().toLowerCase()
    return localPoints.filter((item) => {
      if (localStatusFilter === "active" && !item.isActive) return false
      if (localStatusFilter === "inactive" && item.isActive) return false
      if (localTypeFilter !== "all" && item.type !== localTypeFilter) return false
      if (!q) return true
      const searchable = [item.name, item.nameAr, item.nameEn, item.zoneId, item.addressText]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return searchable.includes(q)
    })
  }, [localPoints, localSearch, localStatusFilter, localTypeFilter])
  const totalLocalPages = Math.max(1, Math.ceil(filteredLocalPoints.length / PAGE_SIZE))
  const paginatedLocalPoints = useMemo(() => {
    const start = (localPage - 1) * PAGE_SIZE
    return filteredLocalPoints.slice(start, start + PAGE_SIZE)
  }, [filteredLocalPoints, localPage])

  const filteredMarkers = useMemo(() => {
    const q = markersSearch.trim().toLowerCase()
    if (!q) return markers
    return markers.filter((item) => `${item.name || ""} ${item.id}`.toLowerCase().includes(q))
  }, [markers, markersSearch])
  const totalMarkersPages = Math.max(1, Math.ceil(filteredMarkers.length / PAGE_SIZE))
  const paginatedMarkers = useMemo(() => {
    const start = (markersPage - 1) * PAGE_SIZE
    return filteredMarkers.slice(start, start + PAGE_SIZE)
  }, [filteredMarkers, markersPage])

  const filteredZones = useMemo(() => {
    const q = zonesSearch.trim().toLowerCase()
    return zones.filter((zone) => {
      if (zonesColorFilter === "colored" && !zone.color) return false
      if (zonesColorFilter === "uncolored" && zone.color) return false
      if (!q) return true
      return `${zone.name} ${zone.id}`.toLowerCase().includes(q)
    })
  }, [zones, zonesSearch, zonesColorFilter])
  const totalZonesPages = Math.max(1, Math.ceil(filteredZones.length / PAGE_SIZE))
  const paginatedZones = useMemo(() => {
    const start = (zonesPage - 1) * PAGE_SIZE
    return filteredZones.slice(start, start + PAGE_SIZE)
  }, [filteredZones, zonesPage])

  useEffect(() => {
    setLocalPage(1)
  }, [localSearch, localStatusFilter, localTypeFilter])

  useEffect(() => {
    if (localPage > totalLocalPages) setLocalPage(totalLocalPages)
  }, [localPage, totalLocalPages])

  useEffect(() => {
    setMarkersPage(1)
  }, [markersSearch])

  useEffect(() => {
    if (markersPage > totalMarkersPages) setMarkersPage(totalMarkersPages)
  }, [markersPage, totalMarkersPages])

  useEffect(() => {
    setZonesPage(1)
  }, [zonesSearch, zonesColorFilter])

  useEffect(() => {
    if (zonesPage > totalZonesPages) setZonesPage(totalZonesPages)
  }, [zonesPage, totalZonesPages])

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
    if (!form.name) {
      toast.error("يرجى إدخال الاسم")
      return
    }

    const lat = Number(form.lat)
    const lng = Number(form.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
      toast.error("يرجى اختيار الموقع من الخريطة")
      return
    }

    try {
      const payload = { ...form, lat, lng }
      if (editing) {
        await apiClient.patch(`/points/${editing._id}`, payload)
        toast.success(`تم تحديث ${labels.pointLabel}`)
      } else {
        await apiClient.post("/points", payload)
        toast.success(`تم إضافة ${labels.pointLabel}`)
      }
      setOpen(false)
      await loadLocalPoints()
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const remove = async (item: Point) => {
    if (!confirm(`حذف ${labels.pointLabel} ${item.name}؟`)) return
    try {
      await apiClient.delete(`/points/${item._id}`)
      setLocalPoints((prev) => prev.filter((i) => i._id !== item._id))
      toast.success(`تم حذف ${labels.pointLabel}`)
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const localExportColumns: ExportColumn<Point>[] = useMemo(
    () => [
      { key: "name", label: `اسم ${labels.pointLabel}`, value: (row) => row.nameAr || row.name },
      { key: "type", label: "النوع", value: (row) => pointTypeLabels[row.type] || row.type },
      { key: "lat", label: "خط العرض", value: (row) => row.lat },
      { key: "lng", label: "خط الطول", value: (row) => row.lng },
      { key: "radius", label: "نصف القطر (متر)", value: (row) => row.radiusMeters },
      { key: "zone", label: "معرف المنطقة", value: (row) => row.zoneId || "-" },
      { key: "address", label: "العنوان", value: (row) => row.addressText || "-" },
      { key: "status", label: "الحالة", value: (row) => (row.isActive ? "مفعل" : "معطل") },
    ],
    [labels.pointLabel]
  )

  return (
    <Card className="text-right">
      <CardHeader>
        <div className="flex items-center justify-between flex-row-reverse">
          <CardTitle>{labels.pointLabel}</CardTitle>
          {activeTab === "local" && (
            <div className="flex items-center gap-2">
              <ExportExcelDialog
                title={`Export ${labels.pointLabel} to Excel`}
                rows={filteredLocalPoints}
                columns={localExportColumns}
                fileBaseName="points"
              />
              <Button onClick={openCreate}>Add {labels.pointLabel}</Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="mb-4">
            <TabsTrigger value="markers">نقاط أثر (Markers)</TabsTrigger>
            <TabsTrigger value="local">نقاط النظام</TabsTrigger>
            <TabsTrigger value="zones">المناطق (Zones)</TabsTrigger>
          </TabsList>

          <TabsContent value="local" className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder={`بحث في ${labels.pointLabel}...`}
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
              <Select value={localStatusFilter} onValueChange={setLocalStatusFilter}>
                <SelectTrigger className="text-right"><SelectValue placeholder="حالة النقطة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="active">مفعّل</SelectItem>
                  <SelectItem value="inactive">معطّل</SelectItem>
                </SelectContent>
              </Select>
              <Select value={localTypeFilter} onValueChange={setLocalTypeFilter}>
                <SelectTrigger className="text-right"><SelectValue placeholder="نوع النقطة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأنواع</SelectItem>
                  <SelectItem value="container">حاوية</SelectItem>
                  <SelectItem value="station">محطة</SelectItem>
                  <SelectItem value="facility">منشأة</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loadingLocal ? (
              <div className="text-sm text-muted-foreground">جاري تحميل نقاط النظام...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-right">
                      <th className="p-2">اسم {labels.pointLabel}</th>
                      <th className="p-2">النوع</th>
                      <th className="p-2">خط العرض</th>
                      <th className="p-2">خط الطول</th>
                      <th className="p-2">معرّف المنطقة</th>
                      <th className="p-2">الحالة</th>
                      <th className="p-2">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLocalPoints.map((item) => (
                      <tr key={item._id} className="border-b">
                        <td className="p-2">{item.nameAr || item.name}</td>
                        <td className="p-2">{pointTypeLabels[item.type] || item.type}</td>
                        <td className="p-2">{item.lat}</td>
                        <td className="p-2">{item.lng}</td>
                        <td className="p-2">{item.zoneId || "-"}</td>
                        <td className="p-2">{item.isActive ? "مفعّل" : "معطّل"}</td>
                        <td className="p-2 space-x-2 space-x-reverse">
                          <Button variant="outline" onClick={() => openEdit(item)}>تعديل</Button>
                          <Button variant="destructive" onClick={() => remove(item)}>حذف</Button>
                        </td>
                      </tr>
                    ))}
                    {paginatedLocalPoints.length === 0 && (
                      <tr>
                        <td className="p-4 text-center text-muted-foreground" colSpan={7}>
                          لا توجد نتائج
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-between border rounded-lg p-2">
              <span className="text-sm text-muted-foreground">صفحة {localPage} من {totalLocalPages}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setLocalPage((p) => p + 1)} disabled={localPage >= totalLocalPages}>
                  التالي
                </Button>
                <Button variant="outline" size="sm" onClick={() => setLocalPage((p) => p - 1)} disabled={localPage <= 1}>
                  السابق
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="markers" className="space-y-3">
            <Input
              placeholder="بحث في نقاط أثر بالاسم أو المعرف..."
              value={markersSearch}
              onChange={(e) => setMarkersSearch(e.target.value)}
            />

            {loadingMarkers ? (
              <div className="text-sm text-muted-foreground">جاري تحميل نقاط أثر...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-right">
                      <th className="p-2">الاسم</th>
                      <th className="p-2">خط العرض</th>
                      <th className="p-2">خط الطول</th>
                      <th className="p-2">المعرف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMarkers.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-2">{item.name || "-"}</td>
                        <td className="p-2">{item.lat}</td>
                        <td className="p-2">{item.lng}</td>
                        <td className="p-2">{item.id}</td>
                      </tr>
                    ))}
                    {paginatedMarkers.length === 0 && (
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
              <span className="text-sm text-muted-foreground">صفحة {markersPage} من {totalMarkersPages}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setMarkersPage((p) => p + 1)} disabled={markersPage >= totalMarkersPages}>
                  التالي
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMarkersPage((p) => p - 1)} disabled={markersPage <= 1}>
                  السابق
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="zones" className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="بحث في المناطق بالاسم أو المعرف..."
                value={zonesSearch}
                onChange={(e) => setZonesSearch(e.target.value)}
              />
              <Select value={zonesColorFilter} onValueChange={setZonesColorFilter}>
                <SelectTrigger className="text-right"><SelectValue placeholder="فلتر اللون" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المناطق</SelectItem>
                  <SelectItem value="colored">مناطق لها لون</SelectItem>
                  <SelectItem value="uncolored">مناطق بدون لون</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loadingZones ? (
              <div className="text-sm text-muted-foreground">جاري تحميل المناطق من أثر...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-right">
                      <th className="p-2">اسم المنطقة</th>
                      <th className="p-2">المعرّف</th>
                      <th className="p-2">اللون</th>
                      <th className="p-2">عدد الرؤوس</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedZones.map((zone) => (
                      <tr key={zone.id} className="border-b">
                        <td className="p-2">{zone.name}</td>
                        <td className="p-2">{zone.id}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <span>{zone.color || "-"}</span>
                            {zone.color && <span className="inline-block h-4 w-4 rounded border" style={{ backgroundColor: zone.color }} />}
                          </div>
                        </td>
                        <td className="p-2">{zone.vertices?.length || 0}</td>
                      </tr>
                    ))}
                    {paginatedZones.length === 0 && (
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
              <span className="text-sm text-muted-foreground">صفحة {zonesPage} من {totalZonesPages}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setZonesPage((p) => p + 1)} disabled={zonesPage >= totalZonesPages}>
                  التالي
                </Button>
                <Button variant="outline" size="sm" onClick={() => setZonesPage((p) => p - 1)} disabled={zonesPage <= 1}>
                  السابق
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="text-right max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `تعديل ${labels.pointLabel}` : `إضافة ${labels.pointLabel}`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>الاسم</Label>
              <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>الاسم بالعربية</Label>
              <Input value={form.nameAr || ""} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
            </div>
            <div>
              <Label>الاسم بالإنجليزية</Label>
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

            <div>
              <Label className="mb-2 block">تحديد الموقع على الخريطة</Label>
              <MapPicker
                lat={Number(form.lat) || 0}
                lng={Number(form.lng) || 0}
                onSelect={(lat, lng) => setForm((f) => ({ ...f, lat, lng }))}
                height="260px"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>خط العرض</Label>
                <Input type="number" step="any" value={form.lat ?? 0} onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })} />
              </div>
              <div>
                <Label>خط الطول</Label>
                <Input type="number" step="any" value={form.lng ?? 0} onChange={(e) => setForm({ ...form, lng: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>نصف القطر (م)</Label>
              <Input type="number" value={form.radiusMeters ?? 500} onChange={(e) => setForm({ ...form, radiusMeters: Number(e.target.value) })} />
            </div>
            <div>
              <Label>العنوان</Label>
              <Input value={form.addressText || ""} onChange={(e) => setForm({ ...form, addressText: e.target.value })} />
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
