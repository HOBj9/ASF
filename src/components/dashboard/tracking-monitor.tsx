"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react"
import { useSession } from "next-auth/react"
import toast from "react-hot-toast"
import { Activity, Link2, RefreshCw, ShieldCheck, Smartphone, Truck, Webhook } from "lucide-react"
import { apiClient } from "@/lib/api/client"
import { useLabels } from "@/hooks/use-labels"
import { useBranches } from "@/hooks/queries/use-branches"
import { useOrganizations } from "@/hooks/queries/use-organizations"
import { isAdmin, isOrganizationAdmin } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loading } from "@/components/ui/loading"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { MapTab } from "./municipality-map"

const MunicipalityMap = dynamic(
  () => import("./municipality-map").then((module) => ({ default: module.MunicipalityMap })),
  {
    ssr: false,
    loading: () => <Loading text="جاري تحميل خريطة التتبع..." />,
  },
)

type TrackingProvider = "athar" | "mobile_app" | "traccar"
type TrackingConnectivityStatus = "moving" | "stopped" | "offline"
type TrackingIngressStatus =
  | "processed"
  | "duplicate"
  | "ignored_late"
  | "rejected"
  | "error"
  | "received"

type OrganizationOption = {
  _id: string
  name: string
}

type BranchOption = {
  _id: string
  name: string
  nameAr?: string
}

type OverviewResponse = {
  scope: {
    type: "branch" | "organization"
    organizationId: string | null
    branchId: string | null
    branchCount: number
  }
  summary: {
    branchCount: number
    totalVehicles: number
    providerVehicleCounts: Record<TrackingProvider, number>
    activeBindingCounts: Record<TrackingProvider, number>
    primaryBindingCounts: Record<TrackingProvider, number>
    liveConnectivityCounts: Record<TrackingConnectivityStatus, number>
    ingressLast24h: Record<TrackingIngressStatus | "total", number>
    providerEnabledBranches: Record<TrackingProvider, number>
  }
  liveVehicles: Array<{
    vehicleId: string
    branchId: string
    branchName: string
    vehicleName: string
    plateNumber?: string | null
    provider: TrackingProvider
    providerLabel: string
    connectivityStatus: TrackingConnectivityStatus
    driverName?: string | null
    lineSupervisorName?: string | null
    lastUpdateLabel: string
    lastReceivedAt?: string | null
    lastRecordedAt?: string | null
    speed: number
    heading: number
    accuracy?: number | null
    coordinates?: [number, number] | null
    insidePointCount: number
  }>
  bindings: Array<{
    _id: string
    branchId: string
    branchName: string
    provider: TrackingProvider
    providerLabel: string
    vehicleId: string
    vehicleName: string
    plateNumber?: string | null
    externalId?: string | null
    isPrimary: boolean
    isActive: boolean
    lastSeenAt?: string | null
    lineSupervisorName?: string | null
    lineSupervisorEmail?: string | null
    capabilities: string[]
    deviceName?: string | null
    platform?: string | null
    appVersion?: string | null
  }>
  recentMessages: Array<{
    _id: string
    branchId?: string | null
    branchName: string
    vehicleId?: string | null
    vehicleName?: string | null
    plateNumber?: string | null
    provider: TrackingProvider
    providerLabel: string
    providerMessageId: string
    status: TrackingIngressStatus
    receivedAt: string
    processedAt?: string | null
    errorMessage?: string | null
    bindingId?: string | null
    batchSize?: number | null
  }>
  branchProviders: Array<{
    branchId: string
    branchName: string
    providers: {
      athar: {
        enabled: boolean
        source: string
        legacyFallback: boolean
      }
      mobile_app: {
        enabled: boolean
        source: string
      }
      traccar: {
        enabled: boolean
        source: string
      }
    }
  }>
}

type BranchTrackingExperience = {
  branch: Record<string, any> | null
  routes: Record<string, any>[]
  events: Record<string, any>[]
  points: Record<string, any>[]
  markers: Record<string, any>[]
  zones: Record<string, any>[]
  objects: Record<string, any>[]
  vehicles: Record<string, any>[]
  liveVehicles: Record<string, any>[]
}

function getProviderLabel(provider: TrackingProvider) {
  if (provider === "mobile_app") return "تطبيق الموبايل"
  if (provider === "traccar") return "تراكار"
  return "أثر"
}

function formatDateTime(value?: string | null) {
  if (!value) return "—"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "—"
  return parsed.toLocaleString("ar-SY", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getLiveStatusClasses(status: TrackingConnectivityStatus) {
  if (status === "moving") return "bg-emerald-500/15 text-emerald-700"
  if (status === "stopped") return "bg-amber-500/15 text-amber-700"
  return "bg-slate-500/15 text-slate-700"
}

function getIngressStatusClasses(status: TrackingIngressStatus) {
  if (status === "processed") return "bg-emerald-500/15 text-emerald-700"
  if (status === "duplicate") return "bg-sky-500/15 text-sky-700"
  if (status === "ignored_late") return "bg-amber-500/15 text-amber-700"
  if (status === "received") return "bg-violet-500/15 text-violet-700"
  return "bg-rose-500/15 text-rose-700"
}

function getProviderSourceLabel(source: string, legacyFallback?: boolean) {
  if (source === "config") return "إعدادات المزوّد"
  if (source === "legacy_branch_key") return legacyFallback ? "مفتاح الفرع القديم" : "مفتاح قديم"
  if (source === "configured_without_key") return "إعداد ناقص"
  return "غير مهيأ"
}

function SummaryCard(props: {
  title: string
  value: string | number
  subtitle?: string
  icon: ComponentType<{ className?: string }>
}) {
  const Icon = props.icon
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-4">
        <div className="space-y-1 text-right">
          <p className="text-sm text-muted-foreground">{props.title}</p>
          <p className="text-2xl font-bold tabular-nums">{props.value}</p>
          {props.subtitle ? <p className="text-xs text-muted-foreground">{props.subtitle}</p> : null}
        </div>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">{text}</div>
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error((payload as any)?.error || "تعذر تحميل البيانات المطلوبة")
  }
  return payload as T
}

export function TrackingMonitor() {
  const { data: session } = useSession()
  const { labels } = useLabels()

  const [selectedOrganizationId, setSelectedOrganizationId] = useState("")
  const [selectedBranchId, setSelectedBranchId] = useState("")
  const [activeTab, setActiveTab] = useState("map")
  const [mapTab, setMapTab] = useState<MapTab>("live")
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [revokingBindingId, setRevokingBindingId] = useState<string | null>(null)
  const [overview, setOverview] = useState<OverviewResponse | null>(null)
  const [branchExperience, setBranchExperience] = useState<BranchTrackingExperience | null>(null)
  const [branchExperienceLoading, setBranchExperienceLoading] = useState(false)

  const userIsAdmin = useMemo(() => isAdmin(session?.user?.role as any), [session?.user?.role])
  const userIsOrgAdmin = useMemo(
    () => isOrganizationAdmin(session?.user?.role as any),
    [session?.user?.role],
  )
  const sessionBranchId = (session?.user as any)?.branchId ?? null
  const sessionOrganizationId = (session?.user as any)?.organizationId ?? null
  const organizationsQuery = useOrganizations(userIsAdmin)
  const organizations = useMemo(
    () => (organizationsQuery.data ?? []) as OrganizationOption[],
    [organizationsQuery.data],
  )
  const branchesQuery = useBranches({
    organizationId: userIsAdmin ? selectedOrganizationId || null : null,
    enabled:
      session !== undefined &&
      (userIsAdmin ? !!selectedOrganizationId : Boolean(userIsOrgAdmin && !sessionBranchId)),
  })
  const branches = useMemo(() => (branchesQuery.data ?? []) as BranchOption[], [branchesQuery.data])

  const resolvedOrganizationId = userIsAdmin
    ? selectedOrganizationId || sessionOrganizationId || ""
    : sessionOrganizationId || ""
  const resolvedBranchId = selectedBranchId || sessionBranchId || ""
  const canLoad = useMemo(() => {
    if (session === undefined) return false
    if (userIsAdmin) return Boolean(resolvedOrganizationId)
    return true
  }, [resolvedOrganizationId, session, userIsAdmin])
  const canLoadBranchExperience = Boolean(resolvedBranchId)

  useEffect(() => {
    if (!userIsAdmin || organizations.length !== 1 || selectedOrganizationId) return
    setSelectedOrganizationId(organizations[0]._id)
  }, [organizations, selectedOrganizationId, userIsAdmin])

  useEffect(() => {
    if (!userIsAdmin || !selectedOrganizationId) return
    setSelectedBranchId("")
  }, [selectedOrganizationId, userIsAdmin])

  const loadOverview = useCallback(
    async (silent = false) => {
      if (!canLoad) {
        setOverview(null)
        return
      }

      if (silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const searchParams = new URLSearchParams()
        if (resolvedBranchId) {
          searchParams.set("branchId", resolvedBranchId)
        } else if (userIsAdmin && resolvedOrganizationId) {
          searchParams.set("organizationId", resolvedOrganizationId)
        }

        const queryString = searchParams.toString()
        const response: any = await apiClient.get(`/tracking/overview${queryString ? `?${queryString}` : ""}`)
        setOverview((response?.data ?? response) as OverviewResponse)
      } catch (error: any) {
        toast.error(error.message || "فشل تحميل بيانات التتبع")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [canLoad, resolvedBranchId, resolvedOrganizationId, userIsAdmin],
  )

  const loadBranchExperience = useCallback(
    async (silent = false) => {
      if (!canLoadBranchExperience) {
        setBranchExperience(null)
        return
      }

      if (!silent) {
        setBranchExperienceLoading(true)
      }

      try {
        const branchQuery = `branchId=${encodeURIComponent(resolvedBranchId)}`
        const [overviewPayload, mapPayload, livePayload] = await Promise.all([
          fetchJson<Record<string, any>>(`/api/dashboard/overview?${branchQuery}`),
          fetchJson<Record<string, any>>(`/api/dashboard/map-data?${branchQuery}`),
          fetchJson<Record<string, any>>(`/api/vehicles/locations?${branchQuery}`),
        ])

        setBranchExperience({
          branch: overviewPayload?.branch || null,
          routes: Array.isArray(overviewPayload?.routes) ? overviewPayload.routes : [],
          events: Array.isArray(overviewPayload?.events) ? overviewPayload.events : [],
          points: Array.isArray(mapPayload?.points) ? mapPayload.points : [],
          markers: Array.isArray(mapPayload?.markers) ? mapPayload.markers : [],
          zones: Array.isArray(mapPayload?.zones) ? mapPayload.zones : [],
          objects: Array.isArray(mapPayload?.objects) ? mapPayload.objects : [],
          vehicles: Array.isArray(mapPayload?.vehicles) ? mapPayload.vehicles : [],
          liveVehicles: Array.isArray(livePayload?.data) ? livePayload.data : [],
        })
      } catch (error: any) {
        toast.error(error?.message || "فشل تحميل خريطة التتبع")
        setBranchExperience(null)
      } finally {
        setBranchExperienceLoading(false)
      }
    },
    [canLoadBranchExperience, resolvedBranchId],
  )

  useEffect(() => {
    if (!canLoad) {
      setOverview(null)
      return
    }
    void loadOverview()
  }, [canLoad, loadOverview])

  useEffect(() => {
    if (!canLoadBranchExperience) {
      setBranchExperience(null)
      return
    }
    void loadBranchExperience()
  }, [canLoadBranchExperience, loadBranchExperience])

  useEffect(() => {
    if (!canLoad) return
    const interval = setInterval(() => {
      void loadOverview(true)
    }, 30000)

    return () => clearInterval(interval)
  }, [canLoad, loadOverview])

  useEffect(() => {
    if (!canLoadBranchExperience) return
    const interval = setInterval(() => {
      void loadBranchExperience(true)
    }, 30000)

    return () => clearInterval(interval)
  }, [canLoadBranchExperience, loadBranchExperience])

  const handleRevokeBinding = useCallback(
    async (bindingId: string) => {
      const confirmed = window.confirm(
        "سيتم إبطال هذا الربط وإيقاف استقبال دفعات التتبع من هذا الجهاز. هل تريد المتابعة؟",
      )
      if (!confirmed) return

      setRevokingBindingId(bindingId)
      try {
        await apiClient.post(`/tracking/bindings/${bindingId}/revoke`)
        toast.success("تم إبطال ربط التتبع")
        await Promise.all([
          loadOverview(true),
          resolvedBranchId ? loadBranchExperience(true) : Promise.resolve(),
        ])
      } catch (error: any) {
        toast.error(error.message || "فشل إبطال الربط")
      } finally {
        setRevokingBindingId(null)
      }
    },
    [loadBranchExperience, loadOverview, resolvedBranchId],
  )

  const manualRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        loadOverview(true),
        resolvedBranchId ? loadBranchExperience(true) : Promise.resolve(),
      ])
    } finally {
      setRefreshing(false)
    }
  }, [loadBranchExperience, loadOverview, resolvedBranchId])

  const liveVehicles = useMemo(
    () =>
      [...(overview?.liveVehicles || [])].sort((left, right) => {
        if (left.connectivityStatus !== right.connectivityStatus) {
          const order = { moving: 0, stopped: 1, offline: 2 }
          return order[left.connectivityStatus] - order[right.connectivityStatus]
        }
        return left.branchName.localeCompare(right.branchName, "ar")
      }),
    [overview?.liveVehicles],
  )

  const activeBindingTotal = useMemo(() => {
    if (!overview) return 0
    return Object.values(overview.summary.activeBindingCounts).reduce((sum, value) => sum + value, 0)
  }, [overview])

  return (
    <div className="space-y-6 text-right">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                مراقبة الحالة الحية، ربط الأجهزة، ودفعات التتبع الواردة من أثر وتطبيق الموبايل، مع عرض
                حي للمركبات وسجل الحركة على الخريطة بفلترة دقيقة حتى مستوى الدقيقة.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => void manualRefresh()}
              disabled={loading || refreshing || branchExperienceLoading}
            >
              <RefreshCw className={`ml-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          </div>

          {(userIsAdmin || (userIsOrgAdmin && !sessionBranchId)) && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              {userIsAdmin && (
                <>
                  <span className="text-sm text-muted-foreground">المؤسسة:</span>
                  <Select value={selectedOrganizationId} onValueChange={setSelectedOrganizationId}>
                    <SelectTrigger className="w-[220px] text-right">
                      <SelectValue placeholder="اختر المؤسسة" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((organization) => (
                        <SelectItem key={organization._id} value={organization._id}>
                          {organization.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              <span className="text-sm text-muted-foreground">{labels.branchLabel || "الفرع"}:</span>
              <Select
                value={selectedBranchId || "all"}
                onValueChange={(value) => setSelectedBranchId(value === "all" ? "" : value)}
                disabled={userIsAdmin && !selectedOrganizationId}
              >
                <SelectTrigger className="w-[240px] text-right">
                  <SelectValue placeholder={`اختر ${labels.branchLabel || "الفرع"}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الفروع</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch._id} value={branch._id}>
                      {branch.nameAr || branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-xs text-muted-foreground">
                {resolvedBranchId
                  ? "يتم عرض بيانات فرع واحد بكل تفاصيل الخريطة والسجل."
                  : "لعرض الخريطة التفصيلية وسجل الحركة بدقة، اختر فرعاً واحداً."}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {!canLoad ? (
        <EmptyState text="يرجى تحديد المؤسسة أولًا لتحميل بيانات التتبع." />
      ) : loading && !overview ? (
        <Loading text="جاري تحميل لوحة التتبع..." />
      ) : !overview ? (
        <EmptyState text="لا توجد بيانات متاحة ضمن هذا النطاق." />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <SummaryCard
              title={`إجمالي ${labels.vehicleLabel || "المركبات"}`}
              value={overview.summary.totalVehicles}
              subtitle={`ضمن ${overview.summary.branchCount} ${overview.summary.branchCount === 1 ? "فرع" : "فروع"}`}
              icon={Truck}
            />
            <SummaryCard
              title="الربوط النشطة"
              value={activeBindingTotal}
              subtitle={`أثر: ${overview.summary.activeBindingCounts.athar} | موبايل: ${overview.summary.activeBindingCounts.mobile_app}`}
              icon={Link2}
            />
            <SummaryCard
              title="مركبات متحركة"
              value={overview.summary.liveConnectivityCounts.moving}
              subtitle="بحسب الحالة الحية الحالية"
              icon={Activity}
            />
            <SummaryCard
              title="مركبات متوقفة"
              value={overview.summary.liveConnectivityCounts.stopped}
              subtitle="بحسب الحالة الحية الحالية"
              icon={ShieldCheck}
            />
            <SummaryCard
              title="مركبات غير متصلة"
              value={overview.summary.liveConnectivityCounts.offline}
              subtitle="بحسب الحالة الحية الحالية"
              icon={Smartphone}
            />
            <SummaryCard
              title="رسائل آخر 24 ساعة"
              value={overview.summary.ingressLast24h.total}
              subtitle={`أخطاء: ${overview.summary.ingressLast24h.error} | مرفوضة: ${overview.summary.ingressLast24h.rejected}`}
              icon={Webhook}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {(["athar", "mobile_app", "traccar"] as TrackingProvider[]).map((provider) => (
              <Card key={provider}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{getProviderLabel(provider)}</span>
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                      {overview.summary.providerEnabledBranches[provider]} فرع مفعّل
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div>مركبات على هذا المزود: {overview.summary.providerVehicleCounts[provider]}</div>
                    <div>ربوط نشطة: {overview.summary.activeBindingCounts[provider]}</div>
                    <div>ربوط أساسية: {overview.summary.primaryBindingCounts[provider]}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 flex h-auto flex-wrap gap-2">
              <TabsTrigger value="map">الخريطة التفصيلية</TabsTrigger>
              <TabsTrigger value="live">الحالة الحية</TabsTrigger>
              <TabsTrigger value="bindings">الربوط</TabsTrigger>
              <TabsTrigger value="messages">الدفعات الواردة</TabsTrigger>
              <TabsTrigger value="providers">المزودات</TabsTrigger>
            </TabsList>

            <TabsContent value="map" className="space-y-4">
              {!resolvedBranchId ? (
                <EmptyState text="اختر فرعاً واحداً لعرض الموقع الحالي، سجل الحركة، والفلاتر الزمنية الدقيقة على الخريطة." />
              ) : branchExperienceLoading && !branchExperience ? (
                <Loading text="جاري تجهيز خريطة التتبع وسجل الحركة..." />
              ) : !branchExperience?.branch ? (
                <EmptyState text="تعذر تحميل بيانات الخريطة لهذا الفرع." />
              ) : (
                <>
                  <Card>
                    <CardContent className="p-4 text-sm text-muted-foreground">
                      من هذه الخريطة يمكنك الضغط على أي مركبة لرؤية موقعها الحالي، عرض سجل الحركة الكامل،
                      تحديد فترة من تاريخ إلى تاريخ ومن ساعة إلى ساعة ومن دقيقة إلى دقيقة، مع تتبع المسار
                      كاملاً على الخريطة بنفس تجربة لوحة التحكم الحالية.
                    </CardContent>
                  </Card>
                  <MunicipalityMap
                    municipality={branchExperience.branch as any}
                    liveVehicles={branchExperience.liveVehicles as any}
                    atharObjects={branchExperience.objects as any}
                    vehicles={branchExperience.vehicles as any}
                    routes={branchExperience.routes as any}
                    zones={branchExperience.zones as any}
                    points={branchExperience.points as any}
                    atharMarkers={branchExperience.markers as any}
                    activeTab={mapTab}
                    onTabChange={setMapTab}
                    events={branchExperience.events as any}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="live">
              <Card>
                <CardHeader>
                  <CardTitle>الحالة الحية للمركبات</CardTitle>
                </CardHeader>
                <CardContent>
                  {liveVehicles.length === 0 ? (
                    <EmptyState text="لا توجد حالات حية ضمن النطاق الحالي." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-right">
                            <th className="p-2">{labels.branchLabel || "الفرع"}</th>
                            <th className="p-2">{labels.vehicleLabel || "المركبة"}</th>
                            <th className="p-2">المزوّد</th>
                            <th className="p-2">الحالة</th>
                            <th className="p-2">مشرف الخط</th>
                            <th className="p-2">آخر تحديث</th>
                            <th className="p-2">السرعة</th>
                            <th className="p-2">الإحداثيات</th>
                            <th className="p-2">داخل نقاط</th>
                          </tr>
                        </thead>
                        <tbody>
                          {liveVehicles.map((item) => (
                            <tr key={item.vehicleId} className="border-b align-top">
                              <td className="p-2">{item.branchName}</td>
                              <td className="p-2">
                                <div className="font-medium">{item.vehicleName}</div>
                                <div className="text-xs text-muted-foreground">{item.plateNumber || "—"}</div>
                              </td>
                              <td className="p-2">{item.providerLabel}</td>
                              <td className="p-2">
                                <span
                                  className={`inline-flex rounded-full px-2 py-1 text-xs ${getLiveStatusClasses(item.connectivityStatus)}`}
                                >
                                  {item.connectivityStatus === "moving"
                                    ? "متحركة"
                                    : item.connectivityStatus === "stopped"
                                      ? "متوقفة"
                                      : "غير متصلة"}
                                </span>
                              </td>
                              <td className="p-2">{item.lineSupervisorName || "—"}</td>
                              <td className="p-2">
                                <div>{item.lastUpdateLabel}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDateTime(item.lastReceivedAt)}
                                </div>
                              </td>
                              <td className="p-2">{item.speed.toFixed(0)} كم/س</td>
                              <td className="p-2">
                                {item.coordinates ? (
                                  <span className="font-mono text-xs">
                                    {item.coordinates[0].toFixed(5)}, {item.coordinates[1].toFixed(5)}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="p-2">{item.insidePointCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bindings">
              <Card>
                <CardHeader>
                  <CardTitle>ربوط التتبع والأجهزة</CardTitle>
                </CardHeader>
                <CardContent>
                  {overview.bindings.length === 0 ? (
                    <EmptyState text="لا توجد ربوط تتبع ضمن النطاق الحالي." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-right">
                            <th className="p-2">{labels.branchLabel || "الفرع"}</th>
                            <th className="p-2">{labels.vehicleLabel || "المركبة"}</th>
                            <th className="p-2">المزوّد</th>
                            <th className="p-2">الجهاز</th>
                            <th className="p-2">الإمكانات</th>
                            <th className="p-2">آخر ظهور</th>
                            <th className="p-2">الحالة</th>
                            <th className="p-2">الإجراء</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overview.bindings.map((binding) => (
                            <tr key={binding._id} className="border-b align-top">
                              <td className="p-2">{binding.branchName}</td>
                              <td className="p-2">
                                <div className="font-medium">{binding.vehicleName}</div>
                                <div className="text-xs text-muted-foreground">{binding.plateNumber || "—"}</div>
                                <div className="text-xs text-muted-foreground">
                                  {binding.lineSupervisorName || binding.lineSupervisorEmail || "—"}
                                </div>
                              </td>
                              <td className="p-2">
                                <div>{binding.providerLabel}</div>
                                <div className="text-xs text-muted-foreground">
                                  {binding.externalId || "بدون معرّف خارجي"}
                                </div>
                              </td>
                              <td className="p-2">
                                <div>{binding.deviceName || "—"}</div>
                                <div className="text-xs text-muted-foreground">
                                  {[binding.platform, binding.appVersion].filter(Boolean).join(" • ") || "—"}
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="flex flex-wrap gap-1">
                                  {binding.capabilities.length > 0 ? (
                                    binding.capabilities.map((capability) => (
                                      <span
                                        key={`${binding._id}-${capability}`}
                                        className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                                      >
                                        {capability}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2">{formatDateTime(binding.lastSeenAt)}</td>
                              <td className="p-2">
                                <div className="flex flex-col gap-1">
                                  <span
                                    className={`inline-flex w-fit rounded-full px-2 py-1 text-xs ${
                                      binding.isActive
                                        ? "bg-emerald-500/15 text-emerald-700"
                                        : "bg-slate-500/15 text-slate-700"
                                    }`}
                                  >
                                    {binding.isActive ? "نشط" : "متوقف"}
                                  </span>
                                  {binding.isPrimary ? (
                                    <span className="inline-flex w-fit rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                                      الربط الأساسي
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="p-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleRevokeBinding(binding._id)}
                                  disabled={revokingBindingId === binding._id}
                                >
                                  {revokingBindingId === binding._id ? "جارٍ الإبطال..." : "إبطال الربط"}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="messages">
              <Card>
                <CardHeader>
                  <CardTitle>الدفعات والرسائل الواردة</CardTitle>
                </CardHeader>
                <CardContent>
                  {overview.recentMessages.length === 0 ? (
                    <EmptyState text="لا توجد رسائل تتبع واردة ضمن النطاق الحالي." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-right">
                            <th className="p-2">وقت الوصول</th>
                            <th className="p-2">المزوّد</th>
                            <th className="p-2">{labels.branchLabel || "الفرع"}</th>
                            <th className="p-2">{labels.vehicleLabel || "المركبة"}</th>
                            <th className="p-2">معرّف الرسالة</th>
                            <th className="p-2">الحالة</th>
                            <th className="p-2">حجم الدفعة</th>
                            <th className="p-2">الخطأ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overview.recentMessages.map((message) => (
                            <tr key={message._id} className="border-b align-top">
                              <td className="p-2">{formatDateTime(message.receivedAt)}</td>
                              <td className="p-2">{message.providerLabel}</td>
                              <td className="p-2">{message.branchName}</td>
                              <td className="p-2">
                                <div>{message.vehicleName || "—"}</div>
                                <div className="text-xs text-muted-foreground">{message.plateNumber || "—"}</div>
                              </td>
                              <td className="p-2 font-mono text-xs">{message.providerMessageId}</td>
                              <td className="p-2">
                                <span
                                  className={`inline-flex rounded-full px-2 py-1 text-xs ${getIngressStatusClasses(message.status)}`}
                                >
                                  {message.status === "processed"
                                    ? "معالجة"
                                    : message.status === "duplicate"
                                      ? "مكررة"
                                      : message.status === "ignored_late"
                                        ? "متأخرة"
                                        : message.status === "rejected"
                                          ? "مرفوضة"
                                          : message.status === "error"
                                            ? "خطأ"
                                            : "مستلمة"}
                                </span>
                              </td>
                              <td className="p-2">{message.batchSize ?? "—"}</td>
                              <td className="p-2 text-xs text-rose-700">{message.errorMessage || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="providers">
              <Card>
                <CardHeader>
                  <CardTitle>تفعيل المزودات حسب الفروع</CardTitle>
                </CardHeader>
                <CardContent>
                  {overview.branchProviders.length === 0 ? (
                    <EmptyState text="لا توجد إعدادات مزودات ضمن النطاق الحالي." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-right">
                            <th className="p-2">{labels.branchLabel || "الفرع"}</th>
                            <th className="p-2">أثر</th>
                            <th className="p-2">تطبيق الموبايل</th>
                            <th className="p-2">تراكار</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overview.branchProviders.map((branch) => (
                            <tr key={branch.branchId} className="border-b align-top">
                              <td className="p-2 font-medium">{branch.branchName}</td>
                              {(["athar", "mobile_app", "traccar"] as TrackingProvider[]).map((provider) => {
                                const providerState = branch.providers[provider]
                                return (
                                  <td key={provider} className="p-2">
                                    <div className="space-y-1">
                                      <span
                                        className={`inline-flex rounded-full px-2 py-1 text-xs ${
                                          providerState.enabled
                                            ? "bg-emerald-500/15 text-emerald-700"
                                            : "bg-slate-500/15 text-slate-700"
                                        }`}
                                      >
                                        {providerState.enabled ? "مفعّل" : "غير مفعّل"}
                                      </span>
                                      <div className="text-xs text-muted-foreground">
                                        {getProviderSourceLabel(
                                          providerState.source,
                                          provider === "athar"
                                            ? branch.providers.athar.legacyFallback
                                            : undefined,
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
