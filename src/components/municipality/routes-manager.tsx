"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import toast from "react-hot-toast"
import { apiClient } from "@/lib/api/client"
import { useLabels } from "@/hooks/use-labels"
import { isAdmin, isOrganizationAdmin, isBranchAdmin } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ExportExcelDialog, type ExportColumn } from "@/components/municipality/export-excel-dialog"
import { Loading } from "@/components/ui/loading"
import { Map as MapIcon, List, BarChart3 } from "lucide-react"
import Link from "next/link"

const RoutePreviewMap = dynamic(
  () => import("@/components/municipality/route-preview-map").then((m) => m.RoutePreviewMap),
  { ssr: false }
)

const AllRoutesMapView = dynamic(
  () => import("@/components/municipality/all-routes-map-view").then((m) => m.AllRoutesMapView),
  { ssr: false }
)

type RouteItem = {
  _id: string
  name: string
  description?: string
  color?: string
  isActive: boolean
  zoneIds?: string[] | Array<{ _id: string; name?: string; nameAr?: string }>
  workScheduleId?: string | { _id: string; name?: string; nameAr?: string } | null
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
  distanceKm?: number
  points: PointItem[]
}

const PAGE_SIZE = 10

const ROUTE_COLOR_PALETTE = [
  "#16a34a",
  "#2563eb",
  "#ea580c",
  "#7c3aed",
  "#dc2626",
  "#0891b2",
  "#db2777",
  "#1e3a5f",
]

const emptyForm: Partial<RouteItem> = {
  name: "",
  description: "",
  color: "#16a34a",
  isActive: true,
}

type Organization = { _id: string; name: string }
type Branch = {
  _id: string
  name: string
  nameAr?: string
  organizationId: string
  fuelPricePerKmGasoline?: number | null
  fuelPricePerKmDiesel?: number | null
}

type VehicleItem = {
  _id: string
  name: string
  fuelType?: "gasoline" | "diesel"
  fuelPricePerKm?: number
  routeId?: string
}

type RouteZoneItem = { _id: string; name: string; nameAr?: string | null; cityId: string; branchId: string; order?: number }

export function RoutesManager() {
  const { data: session } = useSession()
  const { labels } = useLabels()

  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("")
  const [selectedBranchId, setSelectedBranchId] = useState("")

  const [items, setItems] = useState<RouteItem[]>([])
  const [vehicles, setVehicles] = useState<VehicleItem[]>([])
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

  const [inlinePreviewLoading, setInlinePreviewLoading] = useState(false)
  const [inlinePreviewData, setInlinePreviewData] = useState<PreviewResponse | null>(null)
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [startPointId, setStartPointId] = useState<string | null>(null)
  const [endPointId, setEndPointId] = useState<string | null>(null)
  const [optimalOrderLoading, setOptimalOrderLoading] = useState(false)
  const [mapSelectMode, setMapSelectMode] = useState<"start" | "end" | null>(null)
  const [formVehicleId, setFormVehicleId] = useState<string>("")
  const [formZoneIds, setFormZoneIds] = useState<string[]>([])
  const [formWorkScheduleId, setFormWorkScheduleId] = useState<string>("")
  const formWorkScheduleIdRef = useRef<string>("")
  useEffect(() => {
    formWorkScheduleIdRef.current = formWorkScheduleId
  }, [formWorkScheduleId])
  const [workSchedules, setWorkSchedules] = useState<Array<{ _id: string; name: string; nameAr?: string | null }>>([])
  const [viewMode, setViewMode] = useState<"table" | "map">("table")

  const searchParams = useSearchParams()
  const editRouteIdFromUrl = searchParams.get("edit")
  const branchIdFromUrl = searchParams.get("branchId")
  const userIsAdmin = useMemo(() => isAdmin(session?.user?.role as any), [session?.user?.role])
  const userIsOrgAdmin = useMemo(() => isOrganizationAdmin(session?.user?.role as any), [session?.user?.role])
  const userIsBranchAdmin = useMemo(() => isBranchAdmin(session?.user?.role as any), [session?.user?.role])
  const sessionBranchId = (session?.user as any)?.branchId ?? null
  const needsBranchSelector = userIsAdmin || (userIsOrgAdmin && !sessionBranchId)
  const resolvedBranchId = selectedBranchId || branchIdFromUrl || sessionBranchId
  const [routeZones, setRouteZones] = useState<RouteZoneItem[]>([])

  const pointMap = useMemo(() => new Map(points.map((p) => [p._id, p])), [points])

  const loadOrganizations = async () => {
    try {
      const res = await apiClient.get("/organizations").catch(() => ({ organizations: [] } as any))
      const list = res.organizations || res.data?.organizations || []
      setOrganizations(list)
      return list
    } catch {
      return []
    }
  }

  const loadBranches = async (organizationId: string | null) => {
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
  }

  const loadBranchesForOrgUser = async () => {
    try {
      const res = await apiClient.get("/branches")
      const list = res.branches || res.data?.branches || []
      setBranches(list)
      if (list.length === 1 && !selectedBranchId) setSelectedBranchId(list[0]._id)
    } catch {
      setBranches([])
    }
  }

  const load = async (branchId: string | null) => {
    if (needsBranchSelector && !branchId) {
      setItems([])
      setVehicles([])
      return
    }
    setLoading(true)
    try {
      const suffix = branchId ? `?branchId=${branchId}` : ""
      const [routesRes, vehiclesRes] = await Promise.all([
        apiClient.get(`/routes${suffix}`),
        apiClient.get(`/vehicles${suffix}`),
      ])
      setItems(routesRes.routes || routesRes.data?.routes || [])
      setVehicles(vehiclesRes.vehicles || vehiclesRes.data?.vehicles || [])
    } catch (error: any) {
      toast.error(error.message || `فشل تحميل ${labels.routeLabel}`)
      setItems([])
      setVehicles([])
    } finally {
      setLoading(false)
    }
  }

  const loadRouteZones = async (branchId: string | null) => {
    if (!branchId) { setRouteZones([]); return }
    try {
      const res: any = await apiClient.get(`/route-zones?branchId=${branchId}`)
      setRouteZones(res.zones || [])
    } catch {
      setRouteZones([])
    }
  }

  const loadWorkSchedules = async (branchId: string | null) => {
    if (!branchId) { setWorkSchedules([]); return }
    try {
      const res: any = await apiClient.get(`/work-schedules?branchId=${branchId}`)
      setWorkSchedules(res.schedules || [])
    } catch {
      setWorkSchedules([])
    }
  }

  const loadPoints = async (branchId: string | null) => {
    if (needsBranchSelector && !branchId) {
      setPoints([])
      return
    }
    setPointsLoading(true)
    try {
      const url = branchId ? `/points?branchId=${branchId}` : "/points"
      const res: any = await apiClient.get(url)
      setPoints(res.points || res.data?.points || [])
    } catch (error: any) {
      toast.error(error.message || `فشل تحميل ${labels.pointLabel}`)
      setPoints([])
    } finally {
      setPointsLoading(false)
    }
  }

  useEffect(() => {
    if (session === undefined) return
    if (userIsAdmin) {
      loadOrganizations().then((list) => {
        if (list.length === 1 && !selectedOrganizationId) setSelectedOrganizationId(list[0]._id)
      })
    } else if (userIsOrgAdmin && !sessionBranchId) {
      loadBranchesForOrgUser()
    } else if (userIsBranchAdmin) {
      loadBranchesForOrgUser()
    } else {
      load(null)
    }
  }, [session?.user])

  useEffect(() => {
    if (branchIdFromUrl && needsBranchSelector) {
      setSelectedBranchId(branchIdFromUrl)
    }
  }, [branchIdFromUrl, needsBranchSelector])

  useEffect(() => {
    if (userIsAdmin && selectedOrganizationId) {
      loadBranches(selectedOrganizationId)
      if (!branchIdFromUrl) setSelectedBranchId("")
    }
  }, [userIsAdmin, selectedOrganizationId, branchIdFromUrl])

  useEffect(() => {
    if (!needsBranchSelector) return
    if (resolvedBranchId) load(resolvedBranchId)
    else setItems([])
  }, [needsBranchSelector, resolvedBranchId])

  const hasHandledEditFromUrl = useRef(false)
  useEffect(() => {
    if (!editRouteIdFromUrl || items.length === 0 || !resolvedBranchId || hasHandledEditFromUrl.current) return
    const item = items.find((i) => i._id === editRouteIdFromUrl)
    if (item) {
      hasHandledEditFromUrl.current = true
      openEdit(item)
    }
  }, [editRouteIdFromUrl, items, resolvedBranchId])

  useEffect(() => {
    if (!needsBranchSelector && session?.user) load(resolvedBranchId)
  }, [needsBranchSelector, session?.user, resolvedBranchId])

  useEffect(() => {
    if (resolvedBranchId) {
      loadRouteZones(resolvedBranchId)
      loadWorkSchedules(resolvedBranchId)
    } else {
      setRouteZones([])
      setWorkSchedules([])
    }
  }, [resolvedBranchId])

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

  const fetchInlinePreview = useCallback(
    async (pointIds: string[]) => {
      if (pointIds.length < 2 || !resolvedBranchId) return
      setInlinePreviewLoading(true)
      try {
        const res: any = await apiClient.post("/routes/preview", { pointIds, branchId: resolvedBranchId })
        const data = (res.data || res) as PreviewResponse
        setInlinePreviewData(data)
      } catch {
        setInlinePreviewData(null)
      } finally {
        setInlinePreviewLoading(false)
      }
    },
    [resolvedBranchId]
  )

  useEffect(() => {
    if (!open || routePoints.length < 2) {
      setInlinePreviewData(null)
      return
    }
    const pointIds = orderedRoutePoints.map((rp) => rp.pointId)
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current)
    previewDebounceRef.current = setTimeout(() => {
      fetchInlinePreview(pointIds)
      previewDebounceRef.current = null
    }, 450)
    return () => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current)
    }
  }, [open, routePoints, orderedRoutePoints, fetchInlinePreview])

  const runOptimalOrder = async () => {
    if (routePoints.length < 2 || !resolvedBranchId) return
    setOptimalOrderLoading(true)
    try {
      const pointIds = orderedRoutePoints.map((rp) => rp.pointId)
      const start = startPointId || pointIds[0]
      const end = endPointId || pointIds[pointIds.length - 1]
      const res: any = await apiClient.post("/routes/optimal-order", {
        branchId: resolvedBranchId,
        pointIds,
        startPointId: start,
        endPointId: end,
      })
      const data = res.data || res
      const ordered = (data.orderedPointIds || data.points?.map((p: any) => p._id)) as string[]
      if (Array.isArray(ordered) && ordered.length > 0) {
        setRoutePoints(ordered.map((id, idx) => ({ pointId: id, order: idx })))
        setInlinePreviewData({
          geometry: data.geometry || { type: "LineString", coordinates: [] },
          source: data.source || "fallback",
          distanceKm: data.distanceKm,
          points: (data.points || []).map((p: any) => ({
            _id: p._id,
            name: p.name,
            nameAr: p.nameAr,
            lat: p.lat,
            lng: p.lng,
          })),
        })
      }
    } catch (error: any) {
      toast.error(error?.message || "فشل حساب الترتيب الأمثل")
    } finally {
      setOptimalOrderLoading(false)
    }
  }

  const handleMapPointSelect = useCallback((pointId: string) => {
    if (mapSelectMode === "start") {
      setStartPointId(pointId)
      setMapSelectMode(null)
    } else if (mapSelectMode === "end") {
      setEndPointId(pointId)
      setMapSelectMode(null)
    }
  }, [mapSelectMode])

  const currentBranch = useMemo(
    () => branches.find((b) => b._id === resolvedBranchId),
    [branches, resolvedBranchId]
  )

  const openCreate = async () => {
    setEditing(null)
    setForm({ ...emptyForm })
    setFormVehicleId("")
    setFormZoneIds([])
    setFormWorkScheduleId("")
    setRoutePoints([])
    setPointSearch("")
    setInlinePreviewData(null)
    setStartPointId(null)
    setEndPointId(null)
    setMapSelectMode(null)
    setOpen(true)
    await Promise.all([
      loadPoints(resolvedBranchId || null),
      loadWorkSchedules(resolvedBranchId),
      loadRouteZones(resolvedBranchId),
    ])
  }

  const openEdit = async (item: RouteItem) => {
    setEditing(item)
    setForm({
      ...item,
      description: item.description || "",
      color: item.color || "#16a34a",
    })
    const assignedVehicle = vehicles.find((v) => v.routeId === item._id)
    setFormVehicleId(assignedVehicle?._id || "")
    const wsId = item.workScheduleId
    setFormWorkScheduleId(
      typeof wsId === "string" ? wsId : (wsId as any)?._id ? String((wsId as any)._id) : ""
    )
    const zIds = Array.isArray(item.zoneIds)
      ? item.zoneIds.map((z) => String(typeof z === "string" ? z : (z as any)?._id ?? "")).filter(Boolean)
      : []
    setFormZoneIds(zIds)
    setRoutePoints([])
    setPointSearch("")
    setInlinePreviewData(null)
    setStartPointId(null)
    setEndPointId(null)
    setMapSelectMode(null)
    setOpen(true)

    const branchParam = resolvedBranchId ? `?branchId=${resolvedBranchId}` : ""
    await Promise.all([
      loadPoints(resolvedBranchId || null),
      loadWorkSchedules(resolvedBranchId),
      loadRouteZones(resolvedBranchId),
      (async () => {
        try {
          const res: any = await apiClient.get(`/routes/${item._id}/points${branchParam}`)
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

  const submit = async () => {
    if (!form.name) {
      toast.error(`اسم ${labels.routeLabel} مطلوب`)
      return
    }

    if (routePoints.length < 2) {
      toast.error(`يجب اختيار نقطتين على الأقل ضمن ${labels.pointLabel}`)
      return
    }

    const wsIdForConfirm = formWorkScheduleIdRef.current || formWorkScheduleId
    if (!wsIdForConfirm?.trim() && !confirm("المسار غير مربوط بأيام عمل – لن تُحسب الإحصائيات. هل تريد المتابعة؟")) {
      return
    }

    const wsId = formWorkScheduleIdRef.current || formWorkScheduleId
    const routePayload = {
      name: form.name,
      description: form.description ?? "",
      color: form.color ?? "#16a34a",
      isActive: form.isActive ?? true,
      zoneIds: formZoneIds.filter(Boolean).map((id) => String(id)),
      workScheduleId: wsId?.trim() ? String(wsId).trim() : null,
    } as Record<string, unknown>
    if (resolvedBranchId) routePayload.branchId = resolvedBranchId
    const pointsPayload = { points: routePoints } as Record<string, unknown>
    if (resolvedBranchId) pointsPayload.branchId = resolvedBranchId
    try {
      let routeId: string
      if (editing) {
        await apiClient.patch(`/routes/${editing._id}`, routePayload)
        await apiClient.post(`/routes/${editing._id}/points`, pointsPayload)
        routeId = editing._id
        const previouslyAssigned = vehicles.filter((v) => v.routeId === editing._id)
        for (const v of previouslyAssigned) {
          await apiClient.patch(`/vehicles/${v._id}`, { routeId: "", branchId: resolvedBranchId })
        }
        toast.success(`تم تحديث ${labels.routeLabel}`)
      } else {
        const createRes: any = await apiClient.post("/routes", routePayload)
        const createdRoute = createRes.route || createRes.data?.route
        routeId = createdRoute?._id
        if (!routeId) {
          throw new Error("تعذر الحصول على معرف المسار بعد الإنشاء")
        }
        await apiClient.post(`/routes/${routeId}/points`, pointsPayload)
        toast.success(`تم إضافة ${labels.routeLabel}`)
      }
      if (formVehicleId && routeId) {
        await apiClient.patch(`/vehicles/${formVehicleId}`, { routeId, branchId: resolvedBranchId })
      }
      setOpen(false)
      await load(resolvedBranchId || null)
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const remove = async (item: RouteItem) => {
    if (!confirm(`حذف ${labels.routeLabel} ${item.name}؟`)) return
    try {
      const url = resolvedBranchId ? `/routes/${item._id}?branchId=${resolvedBranchId}` : `/routes/${item._id}`
      await apiClient.delete(url)
      setItems((prev) => prev.filter((i) => i._id !== item._id))
      toast.success(`تم حذف ${labels.routeLabel}`)
      await load(resolvedBranchId || null)
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
        <div className="flex flex-wrap items-center justify-between gap-3 flex-row-reverse">
          <CardTitle>{labels.routeLabel}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
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
        {needsBranchSelector && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
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
            {!resolvedBranchId && (userIsAdmin || userIsOrgAdmin) && (
              <span className="text-sm text-muted-foreground">يرجى تحديد {labels.branchLabel || "الفرع"} لتحميل البيانات</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 py-2 border-b">
          <span className="text-sm text-muted-foreground">طريقة العرض:</span>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setViewMode("table")}
          >
            <List className="h-4 w-4" />
            جدول
          </Button>
          <Button
            variant={viewMode === "map" ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setViewMode("map")}
          >
            <MapIcon className="h-4 w-4" />
            عرض كل المسارات على الخريطة
          </Button>
        </div>

        {viewMode === "map" ? (
          <AllRoutesMapView
            branchId={resolvedBranchId}
            labels={{
              routeLabel: labels.routeLabel,
              pointLabel: labels.pointLabel,
              branchLabel: labels.branchLabel,
            }}
          />
        ) : (
          <>
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
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-right">
                  <th className="p-2">الاسم</th>
                  <th className="p-2">الوصف</th>
                  <th className="p-2">جدول العمل</th>
                  <th className="p-2">الحالة</th>
                  <th className="p-2">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => {
                  const ws = item.workScheduleId
                  const wsName = typeof ws === "object" && ws ? (ws.nameAr || ws.name) : null
                  const hasWorkSchedule = !!wsName || (typeof ws === "string" && !!ws)
                  return (
                  <tr key={item._id} className="border-b">
                    <td className="p-2">{item.name}</td>
                    <td className="p-2">{item.description || "-"}</td>
                    <td className="p-2">
                      {wsName || "-"}
                      {!hasWorkSchedule && (
                        <span className="mr-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          غير مربوط
                        </span>
                      )}
                    </td>
                    <td className="p-2">{item.isActive ? "مفعّل" : "معطّل"}</td>
                    <td className="p-2 space-x-2 space-x-reverse">
                      <Link href={`/dashboard/routes/${item._id}/stats${resolvedBranchId ? `?branchId=${resolvedBranchId}` : ""}`}>
                        <Button variant="outline" size="sm" className="gap-1">
                          <BarChart3 className="h-4 w-4" />
                          إحصائيات
                        </Button>
                      </Link>
                      <Button variant="outline" onClick={() => openEdit(item)}>عرض المسار</Button>
                      <Button variant="outline" onClick={() => openEdit(item)}>تعديل</Button>
                      <Button variant="destructive" onClick={() => remove(item)}>حذف</Button>
                    </td>
                  </tr>
                )})}
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
          <span className="text-sm text-muted-foreground">صفحة {page} من {totalPages}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>التالي</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>السابق</Button>
          </div>
        </div>
          </>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="text-right w-[90vw] max-w-7xl max-h-[90vh] overflow-y-auto">
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

            <div>
              <Label>لون المسار</Label>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {ROUTE_COLOR_PALETTE.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      (form.color || "#16a34a") === hex ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: hex }}
                    onClick={() => setForm({ ...form, color: hex })}
                    title={hex}
                  />
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color || "#16a34a"}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-10 h-8 cursor-pointer rounded border"
                  />
                  <span className="text-xs text-muted-foreground">{(form.color || "#16a34a").toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div>
              <Label>المركبة (اختياري)</Label>
              <Select value={formVehicleId || "none"} onValueChange={(v) => setFormVehicleId(v === "none" ? "" : v)}>
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="بدون مركبة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون مركبة</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">يمكنك ربط المسار بمركبة عند الحفظ؛ ستظهر تكلفة الوقود حسب المركبة أدناه.</p>
            </div>

            {resolvedBranchId && (
              <div>
                <Label>جدول العمل (اختياري)</Label>
                <select
                  value={formWorkScheduleId || ""}
                  onChange={(e) => setFormWorkScheduleId(e.target.value || "")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-right"
                >
                  <option value="">بدون جدول عمل</option>
                  {workSchedules.map((ws) => (
                    <option key={ws._id} value={String(ws._id)}>{ws.nameAr || ws.name}</option>
                  ))}
                </select>
                {workSchedules.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">لا توجد جداول عمل. أضف جدولاً من صفحة &quot;أيام العمل&quot; أولاً.</p>
                )}
              </div>
            )}

            {resolvedBranchId && (
              <div>
                <Label>المناطق (اختياري)</Label>
                <div className="flex flex-wrap gap-2 mt-2 border rounded-lg p-2 max-h-32 overflow-y-auto">
                  {routeZones.length === 0 ? (
                    <p className="text-xs text-muted-foreground">لا توجد مناطق. أضف مناطق من صفحة الجغرافيا أولاً.</p>
                  ) : (
                    routeZones.map((z) => {
                      const zId = String(z._id)
                      const checked = formZoneIds.some((id) => String(id) === zId)
                      return (
                        <label key={z._id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) setFormZoneIds((p) => [...p, zId])
                              else setFormZoneIds((p) => p.filter((id) => String(id) !== zId))
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{z.nameAr || z.name}</span>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="border rounded-lg p-3 space-y-3">
                <div className="font-medium">النقاط المتاحة</div>
                <Input
                  placeholder={`بحث في ${labels.pointLabel}...`}
                  value={pointSearch}
                  onChange={(e) => setPointSearch(e.target.value)}
                />

                {pointsLoading ? (
                  <div className="min-h-[200px] flex items-center justify-center border rounded-lg">
                    <Loading text={`جاري تحميل ${labels.pointLabel}...`} className="min-h-0 p-4" />
                  </div>
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

            {orderedRoutePoints.length >= 2 && (
              <div className="border-t pt-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium">معاينة المسار على الخريطة</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMapSelectMode((m) => (m === "start" ? null : "start"))}
                      className={mapSelectMode === "start" ? "ring-2 ring-primary" : ""}
                    >
                      {startPointId ? `البداية: ${pointMap.get(startPointId)?.nameAr || pointMap.get(startPointId)?.name || startPointId}` : "اختر البداية من الخريطة"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMapSelectMode((m) => (m === "end" ? null : "end"))}
                      className={mapSelectMode === "end" ? "ring-2 ring-primary" : ""}
                    >
                      {endPointId ? `النهاية: ${pointMap.get(endPointId)?.nameAr || pointMap.get(endPointId)?.name || endPointId}` : "اختر النهاية من الخريطة"}
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={runOptimalOrder}
                      disabled={optimalOrderLoading}
                    >
                      {optimalOrderLoading ? "جاري الحساب..." : "الترتيب الأمثل للنقاط"}
                    </Button>
                  </div>
                </div>
                {inlinePreviewLoading ? (
                  <div className="h-[50vh] rounded-lg border bg-muted/50 flex items-center justify-center">
                    <Loading text="جاري تحديث المسار..." className="min-h-0" />
                  </div>
                ) : inlinePreviewData ? (
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>مصدر المسار: {inlinePreviewData.source === "osrm" ? "حسب الطرق" : "خط مباشر"}</span>
                      {inlinePreviewData.distanceKm != null && (
                        <span>المسافة: {inlinePreviewData.distanceKm.toFixed(2)} كم</span>
                      )}
                      {inlinePreviewData.distanceKm != null && currentBranch && (currentBranch.fuelPricePerKmGasoline != null || currentBranch.fuelPricePerKmDiesel != null) && (
                        <span className="text-foreground">
                          تكلفة تقديرية (الفرع):{" "}
                          {currentBranch.fuelPricePerKmGasoline != null && (
                            <>بنزين: {(inlinePreviewData.distanceKm * currentBranch.fuelPricePerKmGasoline).toFixed(0)} ل.س</>
                          )}
                          {currentBranch.fuelPricePerKmGasoline != null && currentBranch.fuelPricePerKmDiesel != null && " / "}
                          {currentBranch.fuelPricePerKmDiesel != null && (
                            <>مازوت: {(inlinePreviewData.distanceKm * currentBranch.fuelPricePerKmDiesel).toFixed(0)} ل.س</>
                          )}
                        </span>
                      )}
                      {inlinePreviewData.distanceKm != null && formVehicleId && (() => {
                        const vehicle = vehicles.find((v) => v._id === formVehicleId)
                        if (!vehicle) return null
                        const pricePerKm = vehicle.fuelPricePerKm != null && vehicle.fuelPricePerKm > 0
                          ? vehicle.fuelPricePerKm
                          : (vehicle.fuelType === "diesel"
                            ? currentBranch?.fuelPricePerKmDiesel
                            : currentBranch?.fuelPricePerKmGasoline)
                        if (pricePerKm == null) return null
                        const cost = inlinePreviewData.distanceKm! * pricePerKm
                        return (
                          <span className="text-foreground font-medium">
                            تكلفة الوقود (المركبة المختارة): {cost.toFixed(0)} ل.س
                          </span>
                        )
                      })()}
                    </div>
                    <RoutePreviewMap
                      points={inlinePreviewData.points}
                      geometry={inlinePreviewData.geometry}
                      interactive={true}
                      onPointSelect={handleMapPointSelect}
                      selectedStartId={startPointId}
                      selectedEndId={endPointId}
                      color={form.color || "#16a34a"}
                    />
                  </div>
                ) : (
                  <div className="h-[40vh] rounded-lg border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
                    أضف نقطتين أو أكثر لرؤية المعاينة
                  </div>
                )}
              </div>
            )}
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
