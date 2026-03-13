"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { apiClient } from "@/lib/api/client"
import { isAdmin, isOrganizationAdmin, isBranchAdmin } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import toast from "react-hot-toast"
import { useLabels } from "@/hooks/use-labels"
import { ExportExcelDialog, type ExportColumn } from "@/components/municipality/export-excel-dialog"
import { BranchPointClassificationsAdd } from "@/components/municipality/branch-point-classifications-add"
import { Loading } from "@/components/ui/loading"
import dynamic from "next/dynamic"

const MapPicker = dynamic(
  () => import("@/components/ui/map-picker").then((mod) => mod.MapPicker),
  { ssr: false, loading: () => <div className="h-[240px] rounded-lg border animate-pulse bg-muted" /> }
)

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
  primaryClassificationId?: string | null
  secondaryClassificationId?: string | null
  otherIdentifier?: string | null
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
  primaryClassificationId: null,
  secondaryClassificationId: null,
  otherIdentifier: "",
  isActive: true,
}

const pointTypeLabels: Record<string, string> = {
  container: "حاوية",
  station: "محطة",
  facility: "منشأة",
  other: "أخرى",
}

type Organization = { _id: string; name: string }
type Branch = { _id: string; name: string; nameAr?: string; organizationId: string }

export function PointsManager() {
  const PAGE_SIZE = 10
  const { data: session } = useSession()
  const { labels } = useLabels()

  const [activeTab, setActiveTab] = useState("local")

  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("")
  const [selectedBranchId, setSelectedBranchId] = useState("")

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
  const [localAtharFilter, setLocalAtharFilter] = useState("all")
  const [localPage, setLocalPage] = useState(1)

  const [markersSearch, setMarkersSearch] = useState("")
  const [markersPage, setMarkersPage] = useState(1)

  const [zonesSearch, setZonesSearch] = useState("")
  const [zonesColorFilter, setZonesColorFilter] = useState("all")
  const [zonesPage, setZonesPage] = useState(1)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Point | null>(null)
  const [form, setForm] = useState<Partial<Point>>(emptyForm)
  const [importingMarkers, setImportingMarkers] = useState(false)
  const [importingExcel, setImportingExcel] = useState(false)
  const [creatingZoneId, setCreatingZoneId] = useState<string | null>(null)
  const [selectedPointIds, setSelectedPointIds] = useState<Set<string>>(new Set())
  const [addZonesDialogOpen, setAddZonesDialogOpen] = useState(false)
  const [bulkRadiusMeters, setBulkRadiusMeters] = useState(500)
  const [bulkCreating, setBulkCreating] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ processed: 0, success: 0, total: 0 })
  const [pointToDelete, setPointToDelete] = useState<Point | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pointFormClassifications, setPointFormClassifications] = useState<{
    primaries: { _id: string; name: string; nameAr?: string | null }[]
    secondaries: { _id: string; primaryClassificationId: string; name: string; nameAr?: string | null }[]
  }>({ primaries: [], secondaries: [] })
  const excelFileInputRef = useRef<HTMLInputElement | null>(null)
  const resolvedBranchIdRef = useRef<string>("")

  const userIsAdmin = useMemo(() => isAdmin(session?.user?.role as any), [session?.user?.role])
  const userIsOrgAdmin = useMemo(() => isOrganizationAdmin(session?.user?.role as any), [session?.user?.role])
  const userIsBranchAdmin = useMemo(() => isBranchAdmin(session?.user?.role as any), [session?.user?.role])
  const sessionBranchId = (session?.user as any)?.branchId ?? null
  const needsBranchSelector = userIsAdmin || (userIsOrgAdmin && !sessionBranchId)
  const resolvedBranchId = selectedBranchId || sessionBranchId
  resolvedBranchIdRef.current = resolvedBranchId || ""

  const loadOrganizations = useCallback(async () => {
    try {
      const res = await apiClient.get("/organizations").catch(() => ({ organizations: [] } as any))
      const list = res.organizations || res.data?.organizations || []
      setOrganizations(list)
      return list
    } catch {
      return []
    }
  }, [])

  const loadBranches = useCallback(async (organizationId: string | null) => {
    if (!organizationId) {
      setBranches([])
      return
    }
    try {
      const res = await apiClient.get(`/branches?organizationId=${organizationId}`)
      const list = res.branches || res.data?.branches || []
      setBranches(list)
    } catch {
      setBranches([])
    }
  }, [])

  const loadBranchesForOrgUser = useCallback(async () => {
    try {
      const res = await apiClient.get("/branches")
      const list = res.branches || res.data?.branches || []
      setBranches(list)
      if (list.length === 1 && !selectedBranchId) setSelectedBranchId(list[0]._id)
    } catch {
      setBranches([])
    }
  }, [selectedBranchId])

  const loadLocalPoints = useCallback(async (branchId: string | null) => {
    if (needsBranchSelector && !branchId) {
      setLocalPoints([])
      return
    }
    setLoadingLocal(true)
    try {
      const url = branchId ? `/points?branchId=${branchId}` : "/points"
      const res: any = await apiClient.get(url)
      setLocalPoints(res.points || res.data?.points || [])
    } catch (error: any) {
      toast.error(error.message || `فشل تحميل ${labels.pointLabel}`)
      setLocalPoints([])
    } finally {
      setLoadingLocal(false)
    }
  }, [labels.pointLabel, needsBranchSelector])

  const loadAtharMarkers = useCallback(async () => {
    const branchId = resolvedBranchIdRef.current || resolvedBranchId
    if (needsBranchSelector && !branchId) {
      toast.error("يرجى تحديد الفرع أولاً")
      return
    }
    setLoadingMarkers(true)
    try {
      const branchQuery = branchId ? `?branchId=${encodeURIComponent(branchId)}` : ""
      const res: any = await apiClient.get(`/athar/markers${branchQuery}`)
      setMarkers(res.markers || res.data?.markers || [])
      setMarkersLoaded(true)
    } catch (error: any) {
      toast.error(error.message || "فشل تحميل العلامات من أثر")
    } finally {
      setLoadingMarkers(false)
    }
  }, [needsBranchSelector, resolvedBranchId])

  const loadAtharZones = useCallback(async () => {
    const branchId = resolvedBranchIdRef.current || resolvedBranchId
    if (needsBranchSelector && !branchId) {
      toast.error("يرجى تحديد الفرع أولاً")
      return
    }
    setLoadingZones(true)
    try {
      const zonesSuffix = branchId ? `&branchId=${encodeURIComponent(branchId)}` : ""
      const res: any = await apiClient.get(`/athar/zones?sync=false${zonesSuffix}`)
      setZones(res.zones || res.data?.zones || [])
      setZonesLoaded(true)
    } catch (error: any) {
      toast.error(error.message || "فشل تحميل المناطق من أثر")
    } finally {
      setLoadingZones(false)
    }
  }, [needsBranchSelector, resolvedBranchId])

  useEffect(() => {
    if (session === undefined) return
    if (userIsAdmin) {
      void loadOrganizations().then((list) => {
        if (list.length === 1 && !selectedOrganizationId) setSelectedOrganizationId(list[0]._id)
      })
    } else if (userIsOrgAdmin && !sessionBranchId) {
      void loadBranchesForOrgUser()
    } else {
      void loadLocalPoints(null)
    }
  }, [loadBranchesForOrgUser, loadLocalPoints, loadOrganizations, selectedOrganizationId, session, sessionBranchId, userIsAdmin, userIsOrgAdmin])

  useEffect(() => {
    if (userIsAdmin && selectedOrganizationId) {
      void loadBranches(selectedOrganizationId)
      setSelectedBranchId("")
    }
  }, [loadBranches, selectedOrganizationId, userIsAdmin])

  useEffect(() => {
    if (!needsBranchSelector) return
    if (resolvedBranchId) void loadLocalPoints(resolvedBranchId)
    else setLocalPoints([])
  }, [loadLocalPoints, needsBranchSelector, resolvedBranchId])

  useEffect(() => {
    if (!needsBranchSelector && session?.user) void loadLocalPoints(null)
  }, [loadLocalPoints, needsBranchSelector, session])

  useEffect(() => {
    setMarkersLoaded(false)
    setZonesLoaded(false)
  }, [resolvedBranchId])

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
      if (localAtharFilter === "transferred" && (!item.zoneId || item.zoneId.trim() === "")) return false
      if (localAtharFilter === "not_transferred" && item.zoneId && item.zoneId.trim() !== "") return false
      if (!q) return true
      const searchable = [item.name, item.nameAr, item.nameEn, item.zoneId, item.addressText]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return searchable.includes(q)
    })
  }, [localPoints, localSearch, localStatusFilter, localTypeFilter, localAtharFilter])
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
  }, [localSearch, localStatusFilter, localTypeFilter, localAtharFilter])

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

  const loadClassificationsForForm = useCallback(async () => {
    if (!resolvedBranchId) return
    try {
      const res: any = await apiClient.get(`points/classifications?branchId=${resolvedBranchId}`)
      setPointFormClassifications({
        primaries: res.primaries || [],
        secondaries: res.secondaries || [],
      })
    } catch {
      setPointFormClassifications({ primaries: [], secondaries: [] })
    }
  }, [resolvedBranchId])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm })
    setOpen(true)
    loadClassificationsForForm()
  }

  const openEdit = (item: Point) => {
    setEditing(item)
    setForm({
      ...item,
      nameAr: item.nameAr || "",
      nameEn: item.nameEn || "",
      addressText: item.addressText || "",
      primaryClassificationId: item.primaryClassificationId || null,
      secondaryClassificationId: item.secondaryClassificationId || null,
      otherIdentifier: item.otherIdentifier || "",
    })
    setOpen(true)
    loadClassificationsForForm()
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

    const payload: Record<string, unknown> = {
      ...form,
      lat,
      lng,
      primaryClassificationId: form.primaryClassificationId || null,
      secondaryClassificationId: form.secondaryClassificationId || null,
      otherIdentifier: form.otherIdentifier?.trim() || null,
    }
    if (resolvedBranchId) payload.branchId = resolvedBranchId
    if (userIsAdmin && selectedOrganizationId) payload.organizationId = selectedOrganizationId
    try {
      if (editing) {
        await apiClient.patch(`/points/${editing._id}`, payload)
        toast.success(`تم تحديث ${labels.pointLabel}`)
      } else {
        await apiClient.post("/points", payload)
        toast.success(`تم إضافة ${labels.pointLabel}`)
      }
      setOpen(false)
      await loadLocalPoints(resolvedBranchId || null)
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const openDeleteConfirm = (item: Point) => {
    setPointToDelete(item)
  }

  const remove = async (item: Point, deleteFromAthar: boolean) => {
    const branchId = resolvedBranchIdRef.current || resolvedBranchId
    if (!branchId) {
      toast.error("يرجى تحديد الفرع")
      return
    }
    setDeleting(true)
    try {
      const qs = new URLSearchParams({ branchId })
      if (deleteFromAthar) qs.set("deleteFromAthar", "true")
      await apiClient.delete(`/points/${item._id}?${qs.toString()}`)
      setLocalPoints((prev) => prev.filter((i) => i._id !== item._id))
      setSelectedPointIds((prev) => {
        const next = new Set(prev)
        next.delete(item._id)
        return next
      })
      toast.success(`تم حذف ${labels.pointLabel}`)
      await loadLocalPoints(branchId)
      setPointToDelete(null)
    } catch (error: any) {
      toast.error(error?.message || "حدث خطأ")
    } finally {
      setDeleting(false)
    }
  }

  const importMarkersToSystem = async () => {
    if (!resolvedBranchId || filteredMarkers.length === 0) return
    setImportingMarkers(true)
    try {
      const payload = { branchId: resolvedBranchId, markers: filteredMarkers }
      const res: any = await apiClient.post("/points/import-from-athar", payload)
      const imported = res.imported ?? 0
      const skipped = res.skipped ?? 0
      toast.success(`تم استيراد ${imported} نقطة، وتخطي ${skipped} موجودة مسبقاً`)
      await loadLocalPoints(resolvedBranchId)
    } catch (error: any) {
      toast.error(error.message || "فشل استيراد النقاط")
    } finally {
      setImportingMarkers(false)
    }
  }

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !resolvedBranchId) return
    setImportingExcel(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("branchId", resolvedBranchId)
      const res: any = await apiClient.postFormData("/points/import-from-excel", formData)
      const data = res?.data ?? res
      const imported = data.imported ?? 0
      const skipped = data.skipped ?? 0
      const errs = data.errors
      toast.success(`تم استيراد ${imported} نقطة، وتخطي ${skipped}`)
      if (Array.isArray(errs) && errs.length > 0) {
        errs.slice(0, 3).forEach((msg: string) => toast.error(msg))
      }
      await loadLocalPoints(resolvedBranchId)
    } catch (error: any) {
      toast.error(error?.message || "فشل استيراد الملف")
    } finally {
      setImportingExcel(false)
    }
  }

  const createAtharZone = async (item: Point, radiusMeters?: number) => {
    if (!resolvedBranchId) return
    setCreatingZoneId(item._id)
    try {
      await apiClient.post(`/points/${item._id}/create-athar-zone`, {
        branchId: resolvedBranchId,
        ...(radiusMeters !== undefined && { radiusMeters }),
      })
      toast.success("تم إنشاء المنطقة في أثر وربطها بالنقطة")
      await loadLocalPoints(resolvedBranchId)
      if (editing?._id === item._id) {
        setEditing(null)
        setOpen(false)
      }
    } catch (error: any) {
      toast.error(error.message || "فشل إنشاء المنطقة في أثر")
    } finally {
      setCreatingZoneId(null)
    }
  }

  const selectedPointsForZones = useMemo(() => {
    return localPoints.filter((p) => selectedPointIds.has(p._id))
  }, [localPoints, selectedPointIds])
  const selectedPointsWithoutZone = useMemo(() => {
    return selectedPointsForZones.filter((p) => !p.zoneId)
  }, [selectedPointsForZones])

  const togglePointSelection = (pointId: string) => {
    setSelectedPointIds((prev) => {
      const next = new Set(prev)
      if (next.has(pointId)) next.delete(pointId)
      else next.add(pointId)
      return next
    })
  }

  const toggleSelectAll = () => {
    const allIds = filteredLocalPoints.map((p) => p._id)
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedPointIds.has(id))
    setSelectedPointIds((prev) => {
      const next = new Set(prev)
      if (allSelected) allIds.forEach((id) => next.delete(id))
      else allIds.forEach((id) => next.add(id))
      return next
    })
  }

  const openAddZonesDialog = () => {
    setBulkRadiusMeters(500)
    setAddZonesDialogOpen(true)
  }

  const createBulkAtharZones = async () => {
    const pointsToCreate = selectedPointsForZones
    if (!resolvedBranchId || pointsToCreate.length === 0) return
    setBulkCreating(true)
    setBulkProgress({ processed: 0, success: 0, total: pointsToCreate.length })
    let done = 0
    let failed = 0
    try {
      for (const point of pointsToCreate) {
        try {
          await apiClient.post(`/points/${point._id}/create-athar-zone`, {
            branchId: resolvedBranchId,
            radiusMeters: bulkRadiusMeters,
          })
          done++
        } catch {
          failed++
        }
        setBulkProgress({ processed: done + failed, success: done, total: pointsToCreate.length })
      }
      await loadLocalPoints(resolvedBranchId)
      setSelectedPointIds(new Set())
      setAddZonesDialogOpen(false)
      if (failed === 0) toast.success(`تم إنشاء المناطق في أثر لـ ${done} نقطة`)
      else toast.success(`تم إنشاء ${done} منطقة، فشل ${failed}`)
    } catch (e) {
      toast.error("حدث خطأ أثناء إنشاء المناطق")
    } finally {
      setBulkCreating(false)
      setBulkProgress({ processed: 0, success: 0, total: 0 })
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
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={openAddZonesDialog}
                disabled={!resolvedBranchId || selectedPointIds.size === 0}
              >
                إضافة مناطق للنقاط المحددة ({selectedPointIds.size})
              </Button>
              <input
                ref={excelFileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleExcelImport}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => excelFileInputRef.current?.click()}
                disabled={!resolvedBranchId || importingExcel}
              >
                {importingExcel ? "جاري الاستيراد..." : "استيراد من Excel"}
              </Button>
              <a
                href="/samples/points-import-sample.csv"
                download="points-import-sample.csv"
                className="text-sm text-primary underline"
              >
                تحميل ملف مثال
              </a>
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
        {needsBranchSelector && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border p-3">
            {userIsAdmin && (
              <>
                <span className="text-sm text-muted-foreground">المؤسسة:</span>
                <Select value={selectedOrganizationId} onValueChange={setSelectedOrganizationId}>
                  <SelectTrigger className="w-[200px] text-right">
                    <SelectValue placeholder="يرجى تحديد المؤسسة" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org._id} value={org._id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            <span className="text-sm text-muted-foreground">{labels.branchLabel || "الفرع"}:</span>
            <Select
              value={selectedBranchId}
              onValueChange={setSelectedBranchId}
              disabled={userIsAdmin && !selectedOrganizationId}
            >
              <SelectTrigger className="w-[220px] text-right">
                <SelectValue placeholder={`يرجى تحديد ${labels.branchLabel || "الفرع"}`} />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b._id} value={b._id}>{b.nameAr || b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!resolvedBranchId && (
              <span className="text-sm text-muted-foreground">يرجى تحديد {labels.branchLabel || "الفرع"} لتحميل البيانات</span>
            )}
          </div>
        )}
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="mb-4">
            <TabsTrigger value="markers">نقاط أثر (Markers)</TabsTrigger>
            <TabsTrigger value="local">نقاط النظام</TabsTrigger>
            <TabsTrigger value="zones">المناطق (Zones)</TabsTrigger>
          </TabsList>

          <TabsContent value="local" className="space-y-3">
            {userIsBranchAdmin && (
              <BranchPointClassificationsAdd branchId={resolvedBranchId} canAdd={true} />
            )}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
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
              <Select value={localAtharFilter} onValueChange={setLocalAtharFilter}>
                <SelectTrigger className="text-right"><SelectValue placeholder="حالة أثر" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="transferred">منقول لأثر</SelectItem>
                  <SelectItem value="not_transferred">غير منقول</SelectItem>
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
              <Loading text="جاري تحميل نقاط النظام..." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-right">
                      <th className="p-2 w-10">
                        <Checkbox
                          checked={
                            filteredLocalPoints.length > 0 &&
                            filteredLocalPoints.every((p) => selectedPointIds.has(p._id))
                          }
                          onCheckedChange={toggleSelectAll}
                          aria-label="تحديد الكل"
                        />
                      </th>
                      <th className="p-2">اسم {labels.pointLabel}</th>
                      <th className="p-2">النوع</th>
                      <th className="p-2">خط العرض</th>
                      <th className="p-2">خط الطول</th>
                      <th className="p-2">معرّف المنطقة</th>
                      <th className="p-2">حالة أثر</th>
                      <th className="p-2">الحالة</th>
                      <th className="p-2">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLocalPoints.map((item) => (
                      <tr key={item._id} className="border-b">
                        <td className="p-2 w-10">
                          <Checkbox
                            checked={selectedPointIds.has(item._id)}
                            onCheckedChange={() => togglePointSelection(item._id)}
                            aria-label={`تحديد ${item.nameAr || item.name}`}
                          />
                        </td>
                        <td className="p-2">{item.nameAr || item.name}</td>
                        <td className="p-2">{pointTypeLabels[item.type] || item.type}</td>
                        <td className="p-2">{item.lat}</td>
                        <td className="p-2">{item.lng}</td>
                        <td className="p-2">{item.zoneId || "-"}</td>
                        <td className="p-2">
                          {item.zoneId && item.zoneId.trim() !== "" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              منقول لأثر
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                              غير منقول
                            </span>
                          )}
                        </td>
                        <td className="p-2">{item.isActive ? "مفعّل" : "معطّل"}</td>
                        <td className="p-2 space-x-2 space-x-reverse">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => createAtharZone(item)}
                            disabled={creatingZoneId === item._id}
                          >
                            {creatingZoneId === item._id ? "جاري..." : item.zoneId ? "تحديث منطقة في أثر" : "إنشاء منطقة في أثر"}
                          </Button>
                          <Button variant="outline" onClick={() => openEdit(item)}>تعديل</Button>
                          <Button variant="destructive" onClick={() => openDeleteConfirm(item)}>حذف</Button>
                        </td>
                      </tr>
                    ))}
                    {paginatedLocalPoints.length === 0 && (
                      <tr>
                        <td className="p-4 text-center text-muted-foreground" colSpan={9}>
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
            <div className="flex flex-wrap items-center gap-3">
              <Input
                className="flex-1 min-w-[200px]"
                placeholder="بحث في نقاط أثر بالاسم أو المعرف..."
                value={markersSearch}
                onChange={(e) => setMarkersSearch(e.target.value)}
              />
              <Button
                onClick={importMarkersToSystem}
                disabled={!resolvedBranchId || filteredMarkers.length === 0 || importingMarkers}
              >
                {importingMarkers ? "جاري الاستيراد..." : "تحويل إلى نقاط النظام"}
              </Button>
            </div>

            {loadingMarkers ? (
              <Loading text="جاري تحميل نقاط أثر..." />
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
              <Loading text="جاري تحميل المناطق من أثر..." />
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
            <div>
              <Label>التصنيف الأساسي (اختياري)</Label>
              <Select
                value={form.primaryClassificationId || "none"}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    primaryClassificationId: v === "none" ? null : v,
                    secondaryClassificationId: null,
                  })
                }
              >
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="اختيار التصنيف الأساسي" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— لا شيء —</SelectItem>
                  {pointFormClassifications.primaries.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.nameAr || p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>التصنيف الفرعي (اختياري)</Label>
              <Select
                value={form.secondaryClassificationId || "none"}
                onValueChange={(v) =>
                  setForm({ ...form, secondaryClassificationId: v === "none" ? null : v })
                }
                disabled={!form.primaryClassificationId}
              >
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="اختيار التصنيف الفرعي" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— لا شيء —</SelectItem>
                  {pointFormClassifications.secondaries
                    .filter((s) => String(s.primaryClassificationId) === String(form.primaryClassificationId))
                    .map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.nameAr || s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>رقم تعريفي آخر (اختياري)</Label>
              <Input
                value={form.otherIdentifier || ""}
                onChange={(e) => setForm({ ...form, otherIdentifier: e.target.value })}
                placeholder="مثال: MED-2024-001"
              />
            </div>
            <div className="flex items-center justify-between border rounded-lg p-2">
              <span>مفعّل</span>
              <Switch checked={!!form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
            </div>
            {editing && (
              <div className="border-t pt-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => createAtharZone(editing, form.radiusMeters)}
                  disabled={!!creatingZoneId}
                >
                  {creatingZoneId === editing._id ? "جاري..." : editing.zoneId ? "تحديث منطقة في أثر لهذه النقطة" : "إنشاء منطقة في أثر لهذه النقطة"}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={submit}>{editing ? "تحديث" : "إضافة"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addZonesDialogOpen} onOpenChange={setAddZonesDialogOpen}>
        <DialogContent className="text-right">
          <DialogHeader>
            <DialogTitle>إضافة مناطق في أثر للنقاط المحددة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              سيتم إنشاء منطقة جديدة في أثر لكل نقطة محددة (<strong>{selectedPointsForZones.length}</strong> نقطة).
              إن كانت النقطة لديها معرف منطقة مسبقاً سيتم استبداله بمعرف المنطقة الجديد.
            </p>
            <div>
              <Label htmlFor="bulk-radius">نصف القطر (متر)</Label>
              <Input
                id="bulk-radius"
                type="number"
                min={50}
                max={5000}
                step={50}
                value={bulkRadiusMeters}
                onChange={(e) => setBulkRadiusMeters(Number(e.target.value) || 500)}
                className="mt-1"
              />
            </div>
            {bulkCreating && bulkProgress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    تمت معالجة {bulkProgress.processed} من {bulkProgress.total} نقطة
                    {bulkProgress.success > 0 && (
                      <span className="text-primary font-medium"> ({bulkProgress.success} تم بنجاح)</span>
                    )}
                  </span>
                </div>
                <Progress value={bulkProgress.processed} max={bulkProgress.total} className="h-2" />
              </div>
            )}
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setAddZonesDialogOpen(false)} disabled={bulkCreating}>
              إلغاء
            </Button>
            <Button
              onClick={createBulkAtharZones}
              disabled={bulkCreating || selectedPointsForZones.length === 0}
            >
              {bulkCreating ? "جاري الإنشاء..." : "إنشاء"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pointToDelete} onOpenChange={(open) => !open && setPointToDelete(null)}>
        <DialogContent className="text-right">
          <DialogHeader>
            <DialogTitle>تأكيد حذف {labels.pointLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {pointToDelete && (
                <>
                  النقطة: <strong>{pointToDelete.nameAr || pointToDelete.name}</strong>. هل تريد الحذف من النظام فقط أم من النظام ومن أثر أيضاً؟
                </>
              )}
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => pointToDelete && remove(pointToDelete, false)}
                disabled={deleting}
              >
                {deleting ? "جاري الحذف..." : "حذف من النظام فقط"}
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => pointToDelete && remove(pointToDelete, true)}
                disabled={deleting || !pointToDelete?.zoneId}
              >
                {deleting ? "جاري الحذف..." : "حذف من النظام ومن أثر أيضاً"}
              </Button>
              {pointToDelete && !pointToDelete.zoneId && (
                <p className="text-xs text-muted-foreground">هذه النقطة لا تملك منطقة في أثر، لذا الحذف من أثر غير متاح.</p>
              )}
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="ghost" onClick={() => setPointToDelete(null)} disabled={deleting}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
