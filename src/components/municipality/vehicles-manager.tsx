"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import toast from "react-hot-toast"
import { apiClient } from "@/lib/api/client"
import { useLabels } from "@/hooks/use-labels"
import { isAdmin, isOrganizationAdmin } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ExportExcelDialog, type ExportColumn } from "@/components/municipality/export-excel-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RoutePreviewMap } from "@/components/municipality/route-preview-map"
import { Loading } from "@/components/ui/loading"

type AtharObject = {
  id: string
  imei: string
  name: string
  plateNumber: string | null
  active: boolean
}

type Vehicle = {
  _id: string
  name: string
  plateNumber?: string
  imei: string
  fuelType?: "gasoline" | "diesel"
  fuelPricePerKm?: number
  driverId?: string
  routeId?: string
  branchId?: string
  isActive: boolean
}

type Driver = { _id: string; name: string }
type RouteItem = { _id: string; name: string; color?: string }
type Organization = { _id: string; name: string }
type Branch = {
  _id: string
  name: string
  nameAr?: string
  organizationId: string
  fuelPricePerKmGasoline?: number
  fuelPricePerKmDiesel?: number
}

const emptyForm: Partial<Vehicle> = {
  name: "",
  plateNumber: "",
  imei: "",
  fuelType: "gasoline",
  fuelPricePerKm: undefined,
  driverId: "",
  routeId: "",
  isActive: true,
}

export function VehiclesManager() {
  const PAGE_SIZE = 10
  const { data: session } = useSession()
  const { labels } = useLabels()

  const [items, setItems] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [routes, setRoutes] = useState<RouteItem[]>([])

  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("")
  const [selectedBranchId, setSelectedBranchId] = useState("")

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [driverFilter, setDriverFilter] = useState("all")
  const [routeFilter, setRouteFilter] = useState("all")
  const [page, setPage] = useState(1)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [form, setForm] = useState<Partial<Vehicle>>(emptyForm)

  const [assignOpen, setAssignOpen] = useState(false)
  const [assigning, setAssigning] = useState<Vehicle | null>(null)
  const [assignRouteId, setAssignRouteId] = useState("")
  const [assignPreviewData, setAssignPreviewData] = useState<{ points: Array<{ _id: string; name?: string; nameAr?: string; lat: number; lng: number }>; geometry: { type: "LineString"; coordinates: number[][] }; distanceKm?: number } | null>(null)
  const [assignPreviewLoading, setAssignPreviewLoading] = useState(false)

  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("local")
  const [atharObjects, setAtharObjects] = useState<AtharObject[]>([])
  const [loadingAthar, setLoadingAthar] = useState(false)
  const [atharLoaded, setAtharLoaded] = useState(false)
  const [atharSearch, setAtharSearch] = useState("")
  const [atharPage, setAtharPage] = useState(1)
  const [importingAthar, setImportingAthar] = useState(false)

  const userIsAdmin = useMemo(() => isAdmin(session?.user?.role as any), [session?.user?.role])
  const userIsOrgAdmin = useMemo(() => isOrganizationAdmin(session?.user?.role as any), [session?.user?.role])
  const sessionBranchId = (session?.user as any)?.branchId ?? null
  const needsBranchSelector = userIsAdmin || (userIsOrgAdmin && !sessionBranchId)
  const resolvedBranchId = selectedBranchId || sessionBranchId

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

  const load = useCallback(async (branchId: string | null) => {
    if (needsBranchSelector && !branchId) {
      setItems([])
      setDrivers([])
      setRoutes([])
      return
    }
    setLoading(true)
    try {
      const suffix = branchId ? `?branchId=${branchId}` : ""
      const [vehiclesRes, driversRes, routesRes] = await Promise.all([
        apiClient.get(`/vehicles${suffix}`),
        apiClient.get(`/drivers${suffix}`),
        apiClient.get(`/routes${suffix}`),
      ])
      setItems(vehiclesRes.vehicles || vehiclesRes.data?.vehicles || [])
      setDrivers(driversRes.drivers || driversRes.data?.drivers || [])
      setRoutes(routesRes.routes || routesRes.data?.routes || [])
    } catch (error: any) {
      toast.error(error.message || `فشل تحميل ${labels.vehicleLabel}`)
      setItems([])
      setDrivers([])
      setRoutes([])
    } finally {
      setLoading(false)
    }
  }, [labels.vehicleLabel, needsBranchSelector])

  useEffect(() => {
    if (session === undefined) return
    if (userIsAdmin) {
      void loadOrganizations().then((list) => {
        if (list.length === 1 && !selectedOrganizationId) setSelectedOrganizationId(list[0]._id)
      })
    } else if (userIsOrgAdmin && !sessionBranchId) {
      void loadBranchesForOrgUser()
    } else {
      void load(null)
    }
  }, [load, loadBranchesForOrgUser, loadOrganizations, selectedOrganizationId, session, sessionBranchId, userIsAdmin, userIsOrgAdmin])

  useEffect(() => {
    if (userIsAdmin && selectedOrganizationId) {
      void loadBranches(selectedOrganizationId)
      setSelectedBranchId("")
    }
  }, [loadBranches, selectedOrganizationId, userIsAdmin])

  useEffect(() => {
    if (!needsBranchSelector) return
    if (resolvedBranchId) {
      void load(resolvedBranchId)
    }
    else {
      setItems([])
      setDrivers([])
      setRoutes([])
    }
  }, [load, needsBranchSelector, resolvedBranchId])

  useEffect(() => {
    if (!needsBranchSelector && session?.user) {
      void load(null)
    }
  }, [load, needsBranchSelector, session])

  const loadAtharObjects = async () => {
    if (!resolvedBranchId) return
    setLoadingAthar(true)
    try {
      const res: any = await apiClient.get(`/athar/objects?branchId=${resolvedBranchId}`)
      setAtharObjects(res.objects || res.data?.objects || [])
      setAtharLoaded(true)
    } catch (error: any) {
      toast.error(error.message || "فشل تحميل سيارات أثر")
      setAtharObjects([])
    } finally {
      setLoadingAthar(false)
    }
  }

  const onTabChange = (value: string) => {
    setActiveTab(value)
    if (value === "athar" && !atharLoaded && !loadingAthar && resolvedBranchId) {
      loadAtharObjects()
    }
  }

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      if (statusFilter === "active" && !item.isActive) return false
      if (statusFilter === "inactive" && item.isActive) return false

      if (driverFilter === "with" && !item.driverId) return false
      if (driverFilter === "without" && item.driverId) return false

      if (routeFilter === "with" && !item.routeId) return false
      if (routeFilter === "without" && item.routeId) return false

      if (!q) return true

      const driverName = drivers.find((d) => d._id === item.driverId)?.name || ""
      const routeName = routes.find((r) => r._id === item.routeId)?.name || ""

      return `${item.name} ${item.plateNumber || ""} ${item.imei} ${driverName} ${routeName}`
        .toLowerCase()
        .includes(q)
    })
  }, [items, search, statusFilter, driverFilter, routeFilter, drivers, routes])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredItems.slice(start, start + PAGE_SIZE)
  }, [filteredItems, page])

  const filteredAtharObjects = useMemo(() => {
    const q = atharSearch.trim().toLowerCase()
    if (!q) return atharObjects
    return atharObjects.filter(
      (item) =>
        `${item.name || ""} ${item.id} ${item.imei || ""} ${item.plateNumber || ""}`.toLowerCase().includes(q)
    )
  }, [atharObjects, atharSearch])
  const totalAtharPages = Math.max(1, Math.ceil(filteredAtharObjects.length / PAGE_SIZE))
  const paginatedAtharObjects = useMemo(() => {
    const start = (atharPage - 1) * PAGE_SIZE
    return filteredAtharObjects.slice(start, start + PAGE_SIZE)
  }, [filteredAtharObjects, atharPage])

  useEffect(() => {
    setAtharPage(1)
  }, [atharSearch])
  useEffect(() => {
    if (atharPage > totalAtharPages) setAtharPage(totalAtharPages)
  }, [atharPage, totalAtharPages])

  const importAtharToSystem = async () => {
    if (!resolvedBranchId || filteredAtharObjects.length === 0) return
    setImportingAthar(true)
    try {
      const objects = filteredAtharObjects.map((o) => ({
        id: o.id,
        imei: o.imei,
        name: o.name || undefined,
        plateNumber: o.plateNumber ?? undefined,
      }))
      const res: any = await apiClient.post("/vehicles/import-from-athar", { branchId: resolvedBranchId, objects })
      const imported = res.imported ?? 0
      const skipped = res.skipped ?? 0
      toast.success(`تم استيراد ${imported}، تخطي ${skipped} موجودة مسبقاً`)
      await load(resolvedBranchId)
    } catch (error: any) {
      toast.error(error.message || "فشل استيراد المركبات")
    } finally {
      setImportingAthar(false)
    }
  }

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, driverFilter, routeFilter])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

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
      fuelType: item.fuelType || "gasoline",
      fuelPricePerKm: item.fuelPricePerKm,
      driverId: item.driverId || "",
      routeId: item.routeId || "",
    })
    setOpen(true)
  }

  const submit = async () => {
    const payload: Partial<Vehicle> & { branchId?: string } = {
      ...form,
      fuelType: form.fuelType === "diesel" ? "diesel" : "gasoline",
      driverId: form.driverId === "none" ? "" : form.driverId,
      routeId: form.routeId === "none" ? "" : form.routeId,
      fuelPricePerKm: form.fuelPricePerKm != null ? Number(form.fuelPricePerKm) : undefined,
    }

    if (!payload.name || !payload.imei) {
      toast.error("الاسم ورقم IMEI مطلوبان")
      return
    }

    if (resolvedBranchId) payload.branchId = resolvedBranchId

    try {
      if (editing) {
        await apiClient.patch(`/vehicles/${editing._id}`, payload)
        toast.success(`تم تحديث ${labels.vehicleLabel}`)
      } else {
        await apiClient.post("/vehicles", payload)
        toast.success(`تم إضافة ${labels.vehicleLabel}`)
      }
      setOpen(false)
      await load(resolvedBranchId || null)
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const openAssignRoute = (item: Vehicle) => {
    setAssigning(item)
    setAssignRouteId(item.routeId || "")
    setAssignPreviewData(null)
    setAssignOpen(true)
  }

  useEffect(() => {
    if (!assignOpen || !assignRouteId || !resolvedBranchId) {
      setAssignPreviewData(null)
      return
    }
    let cancelled = false
    setAssignPreviewLoading(true)
    ;(async () => {
      try {
        const branchParam = resolvedBranchId ? `?branchId=${resolvedBranchId}` : ""
        const pointsRes: any = await apiClient.get(`/routes/${assignRouteId}/points${branchParam}`)
        const routePoints = pointsRes.routePoints || []
        const pointIds = routePoints.map((rp: { pointId: string }) => rp.pointId).filter(Boolean)
        if (pointIds.length < 2) {
          if (!cancelled) setAssignPreviewData(null)
          return
        }
        const previewRes: any = await apiClient.post("/routes/preview", { branchId: resolvedBranchId, pointIds })
        if (cancelled) return
        setAssignPreviewData({
          points: previewRes.points || [],
          geometry: previewRes.geometry || { type: "LineString", coordinates: [] },
          distanceKm: previewRes.distanceKm,
        })
      } catch {
        if (!cancelled) setAssignPreviewData(null)
      } finally {
        if (!cancelled) setAssignPreviewLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [assignOpen, assignRouteId, resolvedBranchId])

  const submitAssignRoute = async () => {
    if (!assigning) return
    if (!assignRouteId) {
      toast.error(`يرجى اختيار ${labels.routeLabel}`)
      return
    }

    try {
      await apiClient.patch(`/vehicles/${assigning._id}`, { routeId: assignRouteId })
      toast.success(`تم ربط ${labels.vehicleLabel} بـ ${labels.routeLabel} وإنشاء أحداث Athar`)
      setAssignOpen(false)
      setAssigning(null)
      setAssignRouteId("")
      await load(resolvedBranchId || null)
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء ربط المركبة بالمسار")
    }
  }

  const remove = async (item: Vehicle) => {
    if (!confirm(`حذف ${labels.vehicleLabel} ${item.name}؟`)) return
    try {
      await apiClient.delete(`/vehicles/${item._id}`)
      setItems((prev) => prev.filter((i) => i._id !== item._id))
      toast.success(`تم حذف ${labels.vehicleLabel}`)
      await load(resolvedBranchId || null)
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const exportColumns: ExportColumn<Vehicle>[] = useMemo(
    () => [
      { key: "name", label: `اسم ${labels.vehicleLabel}`, value: (row) => row.name },
      { key: "plate", label: "رقم اللوحة", value: (row) => row.plateNumber || "-" },
      { key: "imei", label: "رقم IMEI", value: (row) => row.imei },
      { key: "fuelType", label: "نوع الوقود", value: (row) => (row.fuelType === "diesel" ? "مازوت" : "بنزين") },
      {
        key: "driver",
        label: labels.driverLabel,
        value: (row) => drivers.find((d) => d._id === row.driverId)?.name || "-",
      },
      {
        key: "route",
        label: labels.routeLabel,
        value: (row) => routes.find((r) => r._id === row.routeId)?.name || "-",
      },
      { key: "status", label: "الحالة", value: (row) => (row.isActive ? "مفعلة" : "معطلة") },
    ],
    [drivers, labels.driverLabel, labels.routeLabel, labels.vehicleLabel, routes]
  )

  return (
    <Card className="text-right">
      <CardHeader>
        <div className="flex flex-row-reverse items-center justify-between">
          <CardTitle>{labels.vehicleLabel}</CardTitle>
          <div className="flex items-center gap-2">
            <ExportExcelDialog
              title={`Export ${labels.vehicleLabel} to Excel`}
              rows={filteredItems}
              columns={exportColumns}
              fileBaseName="vehicles"
            />
            <Button onClick={openCreate}>إضافة {labels.vehicleLabel}</Button>
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
            {!resolvedBranchId && (
              <span className="text-sm text-muted-foreground">يرجى تحديد {labels.branchLabel || "الفرع"} لتحميل البيانات</span>
            )}
          </div>
        )}
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="mb-4">
            <TabsTrigger value="local">مركبات النظام</TabsTrigger>
            <TabsTrigger value="athar">سيارات أثر</TabsTrigger>
          </TabsList>

          <TabsContent value="local" className="space-y-3">
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder={`بحث في ${labels.vehicleLabel}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="text-right">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="active">مفعّلة</SelectItem>
              <SelectItem value="inactive">معطّلة</SelectItem>
            </SelectContent>
          </Select>

          <Select value={driverFilter} onValueChange={setDriverFilter}>
            <SelectTrigger className="text-right">
              <SelectValue placeholder={labels.driverLabel} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل {labels.driverLabel}</SelectItem>
              <SelectItem value="with">مرتبطة بسائق</SelectItem>
              <SelectItem value="without">بدون سائق</SelectItem>
            </SelectContent>
          </Select>

          <Select value={routeFilter} onValueChange={setRouteFilter}>
            <SelectTrigger className="text-right">
              <SelectValue placeholder={labels.routeLabel} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل {labels.routeLabel}</SelectItem>
              <SelectItem value="with">مرتبطة بمسار</SelectItem>
              <SelectItem value="without">بدون مسار</SelectItem>
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
                  <th className="p-2">اسم {labels.vehicleLabel}</th>
                  <th className="p-2">رقم اللوحة</th>
                  <th className="p-2">رقم IMEI</th>
                  <th className="p-2">نوع الوقود</th>
                  <th className="p-2">{labels.driverLabel}</th>
                  <th className="p-2">{labels.routeLabel}</th>
                  <th className="p-2">الحالة</th>
                  <th className="p-2">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => (
                  <tr key={item._id} className="border-b">
                    <td className="p-2">{item.name}</td>
                    <td className="p-2">{item.plateNumber || "-"}</td>
                    <td className="p-2">{item.imei}</td>
                    <td className="p-2">{item.fuelType === "diesel" ? "مازوت" : "بنزين"}</td>
                    <td className="p-2">{drivers.find((d) => d._id === item.driverId)?.name || "-"}</td>
                    <td className="p-2">{routes.find((r) => r._id === item.routeId)?.name || "-"}</td>
                    <td className="p-2">{item.isActive ? "مفعّلة" : "معطّلة"}</td>
                    <td className="space-x-2 space-x-reverse p-2">
                      <Button variant="outline" onClick={() => openAssignRoute(item)}>ربط بمسار</Button>
                      <Button variant="outline" onClick={() => openEdit(item)}>تعديل</Button>
                      <Button variant="destructive" onClick={() => remove(item)}>حذف</Button>
                    </td>
                  </tr>
                ))}

                {paginatedItems.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-muted-foreground" colSpan={8}>
                      لا توجد نتائج
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border p-2">
          <span className="text-sm text-muted-foreground">صفحة {page} من {totalPages}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
              التالي
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
              السابق
            </Button>
          </div>
        </div>
          </TabsContent>

          <TabsContent value="athar" className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                className="flex-1 min-w-[200px]"
                placeholder="بحث في سيارات أثر بالاسم أو المعرف أو IMEI أو اللوحة..."
                value={atharSearch}
                onChange={(e) => setAtharSearch(e.target.value)}
              />
              <Button
                onClick={importAtharToSystem}
                disabled={!resolvedBranchId || filteredAtharObjects.length === 0 || importingAthar}
              >
                {importingAthar ? "جاري الاستيراد..." : "تحويل إلى مركبات النظام"}
              </Button>
            </div>
            {loadingAthar ? (
              <Loading text="جاري تحميل سيارات أثر..." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-right">
                      <th className="p-2">المعرف</th>
                      <th className="p-2">الاسم</th>
                      <th className="p-2">اللوحة</th>
                      <th className="p-2">IMEI</th>
                      <th className="p-2">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAtharObjects.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-2">{item.id}</td>
                        <td className="p-2">{item.name || "-"}</td>
                        <td className="p-2">{item.plateNumber || "-"}</td>
                        <td className="p-2">{item.imei}</td>
                        <td className="p-2">{item.active ? "نشطة" : "غير نشطة"}</td>
                      </tr>
                    ))}
                    {paginatedAtharObjects.length === 0 && (
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
            <div className="flex items-center justify-between rounded-lg border p-2">
              <span className="text-sm text-muted-foreground">صفحة {atharPage} من {totalAtharPages}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setAtharPage((p) => p + 1)} disabled={atharPage >= totalAtharPages}>
                  التالي
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAtharPage((p) => p - 1)} disabled={atharPage <= 1}>
                  السابق
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
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
              <Label>نوع الوقود</Label>
              <Select
                value={form.fuelType || "gasoline"}
                onValueChange={(value: "gasoline" | "diesel") => setForm({ ...form, fuelType: value })}
              >
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="نوع الوقود" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gasoline">بنزين</SelectItem>
                  <SelectItem value="diesel">مازوت</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>سعر الكيلو متر للشاحنة (اختياري)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="مثال: 500"
                value={form.fuelPricePerKm ?? ""}
                onChange={(e) => setForm({ ...form, fuelPricePerKm: e.target.value === "" ? undefined : Number(e.target.value) })}
                className="text-right"
              />
            </div>
            <div>
              <Label>{labels.driverLabel}</Label>
              <Select value={form.driverId || ""} onValueChange={(value) => setForm({ ...form, driverId: value })}>
                <SelectTrigger className="text-right">
                  <SelectValue placeholder={`اختر ${labels.driverLabel}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون</SelectItem>
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
                  <SelectValue placeholder={`اختر ${labels.routeLabel}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون</SelectItem>
                  {routes.map((route) => (
                    <SelectItem key={route._id} value={route._id}>{route.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-2">
              <span>مفعّلة</span>
              <Switch checked={!!form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
            </div>
          </div>

          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={submit}>
              {editing ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="text-right max-w-4xl">
          <DialogHeader>
            <DialogTitle>{`ربط ${labels.vehicleLabel} بـ ${labels.routeLabel}`}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {assigning ? `المركبة: ${assigning.name}` : ""}
            </div>
            <div>
              <Label>{labels.routeLabel}</Label>
              <Select value={assignRouteId} onValueChange={setAssignRouteId}>
                <SelectTrigger className="text-right">
                  <SelectValue placeholder={`اختر ${labels.routeLabel}`} />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((route) => (
                    <SelectItem key={route._id} value={route._id}>{route.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {assignRouteId && (
              <>
                {assignPreviewLoading ? (
                  <div className="h-[40vh] rounded-lg border bg-muted/50 flex items-center justify-center">
                    <Loading text="جاري تحميل المسار..." className="min-h-0" />
                  </div>
                ) : assignPreviewData && assignPreviewData.points.length >= 2 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">المسافة المقطوعة</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-semibold tabular-nums">
                            {assignPreviewData.distanceKm != null
                              ? `${assignPreviewData.distanceKm.toFixed(2)} كم`
                              : "—"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">للمسار المحدد (حسب الطرق)</p>
                        </CardContent>
                      </Card>
                      {assigning && assignPreviewData.distanceKm != null && (() => {
                        const pricePerKm = assigning.fuelPricePerKm != null && assigning.fuelPricePerKm > 0
                          ? assigning.fuelPricePerKm
                          : (assigning.fuelType === "diesel"
                            ? branches.find((b) => b._id === (assigning.branchId || resolvedBranchId))?.fuelPricePerKmDiesel
                            : branches.find((b) => b._id === (assigning.branchId || resolvedBranchId))?.fuelPricePerKmGasoline)
                        const cost = pricePerKm != null ? assignPreviewData.distanceKm! * pricePerKm : null
                        const sourceLabel = assigning.fuelPricePerKm != null && assigning.fuelPricePerKm > 0
                          ? "من إعدادات تكلفة المركبة"
                          : `من إعدادات الفرع (${assigning.fuelType === "diesel" ? "مازوت" : "بنزين"})`
                        return cost != null ? (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">كلفة الوقود لهذا المسار</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-2xl font-semibold tabular-nums">{cost.toFixed(0)} ل.س</p>
                              <p className="text-xs text-muted-foreground mt-1">{sourceLabel}</p>
                            </CardContent>
                          </Card>
                        ) : (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">كلفة الوقود لهذا المسار</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground">غير متاحة — حدّث أسعار الفرع أو سعر الكيلو للمركبة</p>
                            </CardContent>
                          </Card>
                        )
                      })()}
                    </div>
                    <RoutePreviewMap
                      points={assignPreviewData.points}
                      geometry={assignPreviewData.geometry}
                      color={routes.find((r) => r._id === assignRouteId)?.color || "#16a34a"}
                    />
                  </div>
                ) : assignPreviewData === null && !assignPreviewLoading ? (
                  <div className="text-xs text-muted-foreground">المسار المحدد لا يحتوي على نقطتين أو أكثر، أو فشل تحميل المعاينة.</div>
                ) : null}
              </>
            )}
            <p className="text-xs text-muted-foreground">
              عند الربط سيتم إنشاء أحداث الدخول والخروج على Athar لكل نقاط المسار المرتبطة بمناطق.
            </p>
          </div>

          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>إلغاء</Button>
            <Button onClick={submitAssignRoute}>تأكيد الربط</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
