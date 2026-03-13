"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import { ExportExcelDialog, type ExportColumn } from "@/components/municipality/export-excel-dialog"
import { Loading } from "@/components/ui/loading"
import { Download, Upload } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type GovernorateItem = { _id: string; name: string; nameAr?: string | null; order?: number }
type CityItem = { _id: string; name: string; nameAr?: string | null; governorateId: string; order?: number }
type RouteZoneItem = { _id: string; name: string; nameAr?: string | null; cityId: string; branchId: string; order?: number }
type Organization = { _id: string; name: string }
type Branch = { _id: string; name: string; nameAr?: string; organizationId: string }

export function GeographyManager() {
  const { data: session } = useSession()
  const { labels } = useLabels()

  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("")
  const [selectedBranchId, setSelectedBranchId] = useState("")

  const [governorates, setGovernorates] = useState<GovernorateItem[]>([])
  const [cities, setCities] = useState<CityItem[]>([])
  const [routeZones, setRouteZones] = useState<RouteZoneItem[]>([])
  const [loadingGov, setLoadingGov] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  const [loadingZones, setLoadingZones] = useState(false)
  const [govOpen, setGovOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const [zoneOpen, setZoneOpen] = useState(false)
  const [editingGov, setEditingGov] = useState<GovernorateItem | null>(null)
  const [editingCity, setEditingCity] = useState<CityItem | null>(null)
  const [editingZone, setEditingZone] = useState<RouteZoneItem | null>(null)
  const [govForm, setGovForm] = useState({ name: "", nameAr: "" })
  const [cityForm, setCityForm] = useState({ name: "", nameAr: "", governorateId: "" })
  const [zoneForm, setZoneForm] = useState({ name: "", nameAr: "", cityId: "" })
  const [cityFilterGov, setCityFilterGov] = useState("all")
  const [zoneFilterCity, setZoneFilterCity] = useState("all")
  const [activeTab, setActiveTab] = useState("governorates")
  const [importingGov, setImportingGov] = useState(false)
  const [importingCity, setImportingCity] = useState(false)
  const [importingZone, setImportingZone] = useState(false)
  const govFileInputRef = useRef<HTMLInputElement>(null)
  const cityFileInputRef = useRef<HTMLInputElement>(null)
  const zoneFileInputRef = useRef<HTMLInputElement>(null)

  const userIsAdmin = useMemo(() => isAdmin(session?.user?.role as any), [session?.user?.role])
  const userIsOrgAdmin = useMemo(() => isOrganizationAdmin(session?.user?.role as any), [session?.user?.role])
  const userIsBranchAdmin = useMemo(() => isBranchAdmin(session?.user?.role as any), [session?.user?.role])
  const sessionBranchId = (session?.user as any)?.branchId ?? null
  const sessionOrgId = (session?.user as any)?.organizationId ?? null
  const needsBranchSelector = userIsAdmin || (userIsOrgAdmin && !sessionBranchId)
  const resolvedBranchId = selectedBranchId || sessionBranchId
  const branchOrgId = useMemo(() => branches.find((b) => b._id === resolvedBranchId)?.organizationId, [branches, resolvedBranchId])
  const resolvedOrganizationId = selectedOrganizationId || (userIsOrgAdmin ? sessionOrgId : null) || (userIsBranchAdmin ? branchOrgId : null) || ""

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
    if (!organizationId) { setBranches([]); return }
    try {
      const res = await apiClient.get(`/branches?organizationId=${organizationId}`)
      setBranches(res.branches || res.data?.branches || [])
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

  const loadGovernorates = useCallback(async (orgId: string | null) => {
    if (!orgId) { setGovernorates([]); return }
    setLoadingGov(true)
    try {
      const res: any = await apiClient.get(`/organizations/${orgId}/governorates`)
      setGovernorates(res.governorates || [])
    } catch {
      setGovernorates([])
    } finally {
      setLoadingGov(false)
    }
  }, [])

  const loadCities = useCallback(async (orgId: string | null, governorateId?: string) => {
    if (!orgId) { setCities([]); return }
    setLoadingCities(true)
    try {
      const url = governorateId ? `/organizations/${orgId}/cities?governorateId=${governorateId}` : `/organizations/${orgId}/cities`
      const res: any = await apiClient.get(url)
      setCities(res.cities || [])
    } catch {
      setCities([])
    } finally {
      setLoadingCities(false)
    }
  }, [])

  const loadRouteZones = useCallback(async (branchId: string | null, cityId?: string) => {
    if (!branchId) { setRouteZones([]); return }
    setLoadingZones(true)
    try {
      const url = cityId ? `/route-zones?branchId=${branchId}&cityId=${cityId}` : `/route-zones?branchId=${branchId}`
      const res: any = await apiClient.get(url)
      setRouteZones(res.zones || [])
    } catch {
      setRouteZones([])
    } finally {
      setLoadingZones(false)
    }
  }, [])

  useEffect(() => {
    if (session === undefined) return
    if (userIsAdmin) {
      void loadOrganizations().then((list) => {
        if (list.length === 1 && !selectedOrganizationId) setSelectedOrganizationId(list[0]._id)
      })
    } else if (userIsOrgAdmin && !sessionBranchId) {
      void loadBranchesForOrgUser()
    } else if (userIsBranchAdmin) {
      void loadBranchesForOrgUser()
    }
  }, [loadBranchesForOrgUser, loadOrganizations, selectedOrganizationId, session, sessionBranchId, userIsAdmin, userIsBranchAdmin, userIsOrgAdmin])

  useEffect(() => {
    if (userIsAdmin && selectedOrganizationId) {
      void loadBranches(selectedOrganizationId)
      setSelectedBranchId("")
    }
  }, [loadBranches, selectedOrganizationId, userIsAdmin])

  useEffect(() => {
    if ((userIsAdmin || userIsOrgAdmin || userIsBranchAdmin) && resolvedOrganizationId) {
      if (userIsAdmin || userIsOrgAdmin) void loadGovernorates(resolvedOrganizationId)
      else setGovernorates([])
      void loadCities(resolvedOrganizationId, cityFilterGov && cityFilterGov !== "all" ? cityFilterGov : undefined)
    } else {
      setGovernorates([])
      setCities([])
    }
  }, [cityFilterGov, loadCities, loadGovernorates, resolvedOrganizationId, userIsAdmin, userIsBranchAdmin, userIsOrgAdmin])

  useEffect(() => {
    if (resolvedBranchId) {
      void loadRouteZones(resolvedBranchId, zoneFilterCity && zoneFilterCity !== "all" ? zoneFilterCity : undefined)
    } else {
      setRouteZones([])
    }
  }, [loadRouteZones, resolvedBranchId, zoneFilterCity])

  const handleGovImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !resolvedOrganizationId) return
    setImportingGov(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res: any = await apiClient.postFormData(`/organizations/${resolvedOrganizationId}/governorates/import`, fd)
      toast.success(`تم استيراد ${res.imported || 0} محافظة`)
      loadGovernorates(resolvedOrganizationId)
    } catch (err: any) {
      toast.error(err?.message || "فشل الاستيراد")
    } finally {
      setImportingGov(false)
      e.target.value = ""
    }
  }

  const handleCityImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const governorateIdForImport = (cityFilterGov && cityFilterGov !== "all" ? cityFilterGov : null) || cityForm.governorateId
    if (!file || !resolvedOrganizationId || !governorateIdForImport) {
      toast.error("يرجى اختيار المحافظة في الفلتر أولاً")
      return
    }
    setImportingCity(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("governorateId", governorateIdForImport)
      const res: any = await apiClient.postFormData(`/organizations/${resolvedOrganizationId}/cities/import`, fd)
      toast.success(`تم استيراد ${res.imported || 0} مدينة`)
      loadCities(resolvedOrganizationId, cityFilterGov && cityFilterGov !== "all" ? cityFilterGov : undefined)
    } catch (err: any) {
      toast.error(err?.message || "فشل الاستيراد")
    } finally {
      setImportingCity(false)
      e.target.value = ""
    }
  }

  const handleZoneImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const cityIdForImport = (zoneFilterCity && zoneFilterCity !== "all" ? zoneFilterCity : null) || zoneForm.cityId
    if (!file || !resolvedBranchId || !cityIdForImport) {
      toast.error("يرجى اختيار المدينة في الفلتر أو في نموذج الإضافة أولاً")
      return
    }
    setImportingZone(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("branchId", resolvedBranchId)
      fd.append("cityId", cityIdForImport)
      const res: any = await apiClient.postFormData("/route-zones/import", fd)
      toast.success(`تم استيراد ${res.imported || 0} منطقة`)
      loadRouteZones(resolvedBranchId, zoneFilterCity && zoneFilterCity !== "all" ? zoneFilterCity : undefined)
    } catch (err: any) {
      toast.error(err?.message || "فشل الاستيراد")
    } finally {
      setImportingZone(false)
      e.target.value = ""
    }
  }

  return (
    <Card className="text-right">
      <CardHeader>
        <CardTitle>الإدارة الجغرافية</CardTitle>
        <p className="text-sm text-muted-foreground">إدارة المحافظات والمدن والمناطق</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {(userIsAdmin || userIsOrgAdmin || userIsBranchAdmin) && (
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
            {(userIsAdmin || userIsOrgAdmin || userIsBranchAdmin) && (
              <>
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
              </>
            )}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            {(userIsAdmin || userIsOrgAdmin) && <TabsTrigger value="governorates">المحافظات</TabsTrigger>}
            {(userIsAdmin || userIsOrgAdmin) && <TabsTrigger value="cities">المدن</TabsTrigger>}
            {(userIsAdmin || userIsOrgAdmin || userIsBranchAdmin) && <TabsTrigger value="zones">المناطق</TabsTrigger>}
          </TabsList>

          {(userIsAdmin || userIsOrgAdmin) && (
            <TabsContent value="governorates" className="space-y-3 mt-0">
              {!resolvedOrganizationId ? (
                <p className="text-muted-foreground">يرجى تحديد المؤسسة أعلاه</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => { setEditingGov(null); setGovForm({ name: "", nameAr: "" }); setGovOpen(true) }}>إضافة محافظة</Button>
                    <Button variant="outline" size="sm" onClick={() => govFileInputRef.current?.click()} disabled={importingGov} className="gap-1">
                      <Upload className="h-4 w-4" />
                      {importingGov ? "جاري الاستيراد..." : "استيراد Excel"}
                    </Button>
                    <input ref={govFileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleGovImport} />
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/api/organizations/${resolvedOrganizationId}/governorates/template`} download className="gap-1">
                        <Download className="h-4 w-4" />
                        قالب Excel
                      </a>
                    </Button>
                    <ExportExcelDialog title="تصدير المحافظات" rows={governorates} columns={[
                      { key: "name", label: "الاسم", value: (r) => r.name },
                      { key: "nameAr", label: "الاسم العربي", value: (r) => r.nameAr || "-" },
                    ]} fileBaseName="governorates" />
                  </div>
                  {loadingGov ? <Loading /> : (
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b text-right"><th className="p-2">الاسم</th><th className="p-2">الاسم العربي</th><th className="p-2">الإجراءات</th></tr></thead>
                        <tbody>
                          {governorates.map((g) => (
                            <tr key={g._id} className="border-b">
                              <td className="p-2">{g.name}</td>
                              <td className="p-2">{g.nameAr || "-"}</td>
                              <td className="p-2 space-x-2 space-x-reverse">
                                <Button variant="outline" size="sm" onClick={() => { setEditingGov(g); setGovForm({ name: g.name, nameAr: g.nameAr || "" }); setGovOpen(true) }}>تعديل</Button>
                                <Button variant="destructive" size="sm" onClick={async () => {
                                  if (!confirm("حذف المحافظة؟")) return
                                  try {
                                    await apiClient.delete(`/organizations/${resolvedOrganizationId}/governorates/${g._id}`)
                                    toast.success("تم الحذف")
                                    loadGovernorates(resolvedOrganizationId)
                                  } catch (e: any) { toast.error(e?.message || "فشل") }
                                }}>حذف</Button>
                              </td>
                            </tr>
                          ))}
                          {governorates.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">لا توجد محافظات</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          )}

          {(userIsAdmin || userIsOrgAdmin) && (
            <TabsContent value="cities" className="space-y-3 mt-0">
              {!resolvedOrganizationId ? (
                <p className="text-muted-foreground">يرجى تحديد المؤسسة أعلاه</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Select value={cityFilterGov || "all"} onValueChange={(v) => { setCityFilterGov(v); loadCities(resolvedOrganizationId, v !== "all" ? v : undefined) }}>
                      <SelectTrigger className="w-[180px] text-right"><SelectValue placeholder="فلتر: المحافظة" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كل المحافظات</SelectItem>
                        {governorates.map((g) => <SelectItem key={g._id} value={g._id}>{g.nameAr || g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => { setEditingCity(null); setCityForm({ name: "", nameAr: "", governorateId: (cityFilterGov && cityFilterGov !== "all" ? cityFilterGov : governorates[0]?._id) || "" }); setCityOpen(true) }} disabled={!governorates.length}>إضافة مدينة</Button>
                    <Button variant="outline" size="sm" onClick={() => cityFileInputRef.current?.click()} disabled={importingCity || !((cityFilterGov && cityFilterGov !== "all") || cityForm.governorateId)} className="gap-1">
                      <Upload className="h-4 w-4" />
                      {importingCity ? "جاري الاستيراد..." : "استيراد Excel"}
                    </Button>
                    <input ref={cityFileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleCityImport} />
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/api/organizations/${resolvedOrganizationId}/cities/template`} download className="gap-1">
                        <Download className="h-4 w-4" />
                        قالب Excel
                      </a>
                    </Button>
                    <ExportExcelDialog title="تصدير المدن" rows={cities} columns={[
                      { key: "name", label: "الاسم", value: (r) => r.name },
                      { key: "nameAr", label: "الاسم العربي", value: (r) => r.nameAr || "-" },
                    ]} fileBaseName="cities" />
                  </div>
                  {loadingCities ? <Loading /> : (
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b text-right"><th className="p-2">الاسم</th><th className="p-2">الاسم العربي</th><th className="p-2">الإجراءات</th></tr></thead>
                        <tbody>
                          {cities.map((c) => (
                            <tr key={c._id} className="border-b">
                              <td className="p-2">{c.name}</td>
                              <td className="p-2">{c.nameAr || "-"}</td>
                              <td className="p-2 space-x-2 space-x-reverse">
                                <Button variant="outline" size="sm" onClick={() => { setEditingCity(c); setCityForm({ name: c.name, nameAr: c.nameAr || "", governorateId: c.governorateId }); setCityOpen(true) }}>تعديل</Button>
                                <Button variant="destructive" size="sm" onClick={async () => {
                                  if (!confirm("حذف المدينة؟")) return
                                  try {
                                    await apiClient.delete(`/organizations/${resolvedOrganizationId}/cities/${c._id}`)
                                    toast.success("تم الحذف")
                                    loadCities(resolvedOrganizationId, cityFilterGov && cityFilterGov !== "all" ? cityFilterGov : undefined)
                                  } catch (e: any) { toast.error(e?.message || "فشل") }
                                }}>حذف</Button>
                              </td>
                            </tr>
                          ))}
                          {cities.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">لا توجد مدن</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          )}

          {(userIsAdmin || userIsOrgAdmin || userIsBranchAdmin) && (
            <TabsContent value="zones" className="space-y-3 mt-0">
              {!resolvedBranchId ? (
                <p className="text-muted-foreground">يرجى تحديد الفرع أعلاه</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Select value={zoneFilterCity || "all"} onValueChange={(v) => { setZoneFilterCity(v); loadRouteZones(resolvedBranchId, v !== "all" ? v : undefined) }}>
                      <SelectTrigger className="w-[180px] text-right"><SelectValue placeholder="فلتر: المدينة" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كل المدن</SelectItem>
                        {cities.map((c) => <SelectItem key={c._id} value={c._id}>{c.nameAr || c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => { setEditingZone(null); setZoneForm({ name: "", nameAr: "", cityId: (zoneFilterCity && zoneFilterCity !== "all" ? zoneFilterCity : cities[0]?._id) || "" }); setZoneOpen(true) }} disabled={!cities.length}>إضافة منطقة</Button>
                    <Button variant="outline" size="sm" onClick={() => zoneFileInputRef.current?.click()} disabled={importingZone || !(zoneFilterCity && zoneFilterCity !== "all" ? zoneFilterCity : zoneForm.cityId)} className="gap-1">
                      <Upload className="h-4 w-4" />
                      {importingZone ? "جاري الاستيراد..." : "استيراد Excel"}
                    </Button>
                    <input ref={zoneFileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleZoneImport} />
                    <Button variant="outline" size="sm" asChild>
                      <a href="/api/route-zones/template" download className="gap-1">
                        <Download className="h-4 w-4" />
                        قالب Excel
                      </a>
                    </Button>
                    <ExportExcelDialog title="تصدير المناطق" rows={routeZones} columns={[
                      { key: "name", label: "الاسم", value: (r) => r.name },
                      { key: "nameAr", label: "الاسم العربي", value: (r) => r.nameAr || "-" },
                    ]} fileBaseName="route-zones" />
                  </div>
                  {loadingZones ? <Loading /> : (
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b text-right"><th className="p-2">الاسم</th><th className="p-2">الاسم العربي</th><th className="p-2">الإجراءات</th></tr></thead>
                        <tbody>
                          {routeZones.map((z) => (
                            <tr key={z._id} className="border-b">
                              <td className="p-2">{z.name}</td>
                              <td className="p-2">{z.nameAr || "-"}</td>
                              <td className="p-2 space-x-2 space-x-reverse">
                                <Button variant="outline" size="sm" onClick={() => { setEditingZone(z); setZoneForm({ name: z.name, nameAr: z.nameAr || "", cityId: z.cityId }); setZoneOpen(true) }}>تعديل</Button>
                                <Button variant="destructive" size="sm" onClick={async () => {
                                  if (!confirm("حذف المنطقة؟")) return
                                  try {
                                    await apiClient.delete(`/route-zones/${z._id}?branchId=${resolvedBranchId}`)
                                    toast.success("تم الحذف")
                                    loadRouteZones(resolvedBranchId, zoneFilterCity && zoneFilterCity !== "all" ? zoneFilterCity : undefined)
                                  } catch (e: any) { toast.error(e?.message || "فشل") }
                                }}>حذف</Button>
                              </td>
                            </tr>
                          ))}
                          {routeZones.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">لا توجد مناطق</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          )}
        </Tabs>

        <Dialog open={govOpen} onOpenChange={setGovOpen}>
          <DialogContent className="text-right">
            <DialogHeader>
              <DialogTitle>{editingGov ? "تعديل محافظة" : "إضافة محافظة"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div><Label>الاسم</Label><Input value={govForm.name} onChange={(e) => setGovForm({ ...govForm, name: e.target.value })} /></div>
              <div><Label>الاسم العربي</Label><Input value={govForm.nameAr} onChange={(e) => setGovForm({ ...govForm, nameAr: e.target.value })} /></div>
            </div>
            <DialogFooter className="flex-row-reverse gap-2">
              <Button variant="outline" onClick={() => setGovOpen(false)}>إلغاء</Button>
              <Button onClick={async () => {
                if (!govForm.name.trim()) { toast.error("الاسم مطلوب"); return }
                try {
                  if (editingGov) {
                    await apiClient.patch(`/organizations/${resolvedOrganizationId}/governorates/${editingGov._id}`, govForm)
                    toast.success("تم التحديث")
                  } else {
                    await apiClient.post(`/organizations/${resolvedOrganizationId}/governorates`, govForm)
                    toast.success("تم الإضافة")
                  }
                  setGovOpen(false)
                  loadGovernorates(resolvedOrganizationId)
                } catch (e: any) { toast.error(e?.message || "فشل") }
              }}>{editingGov ? "تحديث" : "إضافة"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={cityOpen} onOpenChange={setCityOpen}>
          <DialogContent className="text-right">
            <DialogHeader>
              <DialogTitle>{editingCity ? "تعديل مدينة" : "إضافة مدينة"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div>
                <Label>المحافظة</Label>
                <Select value={cityForm.governorateId} onValueChange={(v) => setCityForm({ ...cityForm, governorateId: v })}>
                  <SelectTrigger className="text-right"><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                  <SelectContent>
                    {governorates.map((g) => <SelectItem key={g._id} value={g._id}>{g.nameAr || g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>الاسم</Label><Input value={cityForm.name} onChange={(e) => setCityForm({ ...cityForm, name: e.target.value })} /></div>
              <div><Label>الاسم العربي</Label><Input value={cityForm.nameAr} onChange={(e) => setCityForm({ ...cityForm, nameAr: e.target.value })} /></div>
            </div>
            <DialogFooter className="flex-row-reverse gap-2">
              <Button variant="outline" onClick={() => setCityOpen(false)}>إلغاء</Button>
              <Button onClick={async () => {
                if (!cityForm.name.trim() || !cityForm.governorateId) { toast.error("الاسم والمحافظة مطلوبان"); return }
                try {
                  if (editingCity) {
                    await apiClient.patch(`/organizations/${resolvedOrganizationId}/cities/${editingCity._id}`, cityForm)
                    toast.success("تم التحديث")
                  } else {
                    await apiClient.post(`/organizations/${resolvedOrganizationId}/cities`, cityForm)
                    toast.success("تم الإضافة")
                  }
                  setCityOpen(false)
                  loadCities(resolvedOrganizationId, cityFilterGov && cityFilterGov !== "all" ? cityFilterGov : undefined)
                } catch (e: any) { toast.error(e?.message || "فشل") }
              }}>{editingCity ? "تحديث" : "إضافة"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={zoneOpen} onOpenChange={setZoneOpen}>
          <DialogContent className="text-right">
            <DialogHeader>
              <DialogTitle>{editingZone ? "تعديل منطقة" : "إضافة منطقة"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div>
                <Label>المدينة</Label>
                <Select value={zoneForm.cityId} onValueChange={(v) => setZoneForm({ ...zoneForm, cityId: v })}>
                  <SelectTrigger className="text-right"><SelectValue placeholder="اختر المدينة" /></SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => <SelectItem key={c._id} value={c._id}>{c.nameAr || c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>الاسم</Label><Input value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} /></div>
              <div><Label>الاسم العربي</Label><Input value={zoneForm.nameAr} onChange={(e) => setZoneForm({ ...zoneForm, nameAr: e.target.value })} /></div>
            </div>
            <DialogFooter className="flex-row-reverse gap-2">
              <Button variant="outline" onClick={() => setZoneOpen(false)}>إلغاء</Button>
              <Button onClick={async () => {
                if (!zoneForm.name.trim() || !zoneForm.cityId || !resolvedBranchId) { toast.error("الاسم والمدينة مطلوبان"); return }
                try {
                  const payload = { ...zoneForm, branchId: resolvedBranchId }
                  if (editingZone) {
                    await apiClient.patch(`/route-zones/${editingZone._id}`, payload)
                    toast.success("تم التحديث")
                  } else {
                    await apiClient.post("/route-zones", payload)
                    toast.success("تم الإضافة")
                  }
                  setZoneOpen(false)
                  loadRouteZones(resolvedBranchId, zoneFilterCity && zoneFilterCity !== "all" ? zoneFilterCity : undefined)
                } catch (e: any) { toast.error(e?.message || "فشل") }
              }}>{editingZone ? "تحديث" : "إضافة"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
