"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import toast from "react-hot-toast"
import { RefreshCw } from "lucide-react"
import { apiClient } from "@/lib/api/client"
import { useLabels } from "@/hooks/use-labels"
import { useBranches } from "@/hooks/queries/use-branches"
import { useOrganizations } from "@/hooks/queries/use-organizations"
import { isAdmin, isOrganizationAdmin } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
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
type TrackingSourceView = TrackingProvider | "overview"
type TrackingIngressStatus =
  | "processed"
  | "duplicate"
  | "ignored_late"
  | "rejected"
  | "error"
  | "received"
type TrackingSelection = {
  type: "vehicle" | "event" | null
  id: string | null
}

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
    trackingKey?: string
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

const TRACKING_SOURCE_STORAGE_KEY = "tracking-monitor-source-view"
const TRACKING_PROVIDERS: TrackingProvider[] = ["athar", "mobile_app", "traccar"]

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
  accent?: "default" | "success" | "warning" | "danger"
}) {
  const accentDot =
    props.accent === "success"
      ? "bg-emerald-500"
      : props.accent === "warning"
        ? "bg-amber-500"
        : props.accent === "danger"
          ? "bg-rose-500"
          : "bg-primary"

  return (
    <div className="flex flex-col gap-1 border-r border-border px-4 first:pr-0 first:border-r-0 last:pl-0">
      <p className="text-xs font-medium text-muted-foreground">{props.title}</p>
      <p className="text-3xl font-bold tabular-nums leading-none">{props.value}</p>
      {props.subtitle ? (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${accentDot}`} />
          {props.subtitle}
        </p>
      ) : null}
    </div>
  )
}

function SummaryCardBox(props: {
  title: string
  value: string | number
  subtitle?: string
  accent?: "default" | "success" | "warning" | "danger"
}) {
  const accentDot =
    props.accent === "success"
      ? "bg-emerald-500"
      : props.accent === "warning"
        ? "bg-amber-500"
        : props.accent === "danger"
          ? "bg-rose-500"
          : "bg-primary"

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{props.title}</p>
      <p className="text-2xl font-bold tabular-nums leading-none">{props.value}</p>
      {props.subtitle ? (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${accentDot}`} />
          {props.subtitle}
        </p>
      ) : null}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-border p-8">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

function StatusDot({ status }: { status: TrackingConnectivityStatus }) {
  if (status === "moving") return <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_4px_0] shadow-emerald-500/60" />
  if (status === "stopped") return <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
  return <span className="inline-block h-2 w-2 rounded-full bg-slate-500" />
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error((payload as any)?.error || "تعذر تحميل البيانات المطلوبة")
  }
  return payload as T
}

function getSourceViewLabel(sourceView: TrackingSourceView) {
  if (sourceView === "mobile_app") return "تتبع GPS"
  if (sourceView === "traccar") return "تتبع Traccar"
  if (sourceView === "athar") return "تتبع أثر"
  return "مركز المراقبة"
}

function getSourceViewDescription(sourceView: TrackingSourceView) {
  if (sourceView === "athar") {
    return "لوحة تشغيلية تركز على مركبات أثر، مع الانتقال السريع من المركبة إلى التفاصيل ثم التقارير المرتبطة."
  }
  if (sourceView === "mobile_app") {
    return "عرض مباشر لمركبات GPS الموبايل مع سجل الحركة، حالة الاتصال، والجهاز والتطبيق عند توفرهما."
  }
  if (sourceView === "traccar") {
    return "عرض مباشر لمركبات Traccar مع نفس رحلة المشغل: مباشر الآن، ثم تفاصيل، ثم التقارير."
  }
  return "مساحة إدارية تعرض الصورة الشاملة للربوط، الرسائل الواردة، وحالة المزودات ضمن النطاق الحالي."
}

export function TrackingMonitor() {
  const { data: session } = useSession()
  const { labels } = useLabels()

  const [selectedOrganizationId, setSelectedOrganizationId] = useState("")
  const [selectedBranchId, setSelectedBranchId] = useState("")
  const [sourceView, setSourceView] = useState<TrackingSourceView>("overview")
  const [sourceViewInitialized, setSourceViewInitialized] = useState(false)
  const [overviewTab, setOverviewTab] = useState("map")
  const [mapTab, setMapTab] = useState<MapTab>("live")
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [revokingBindingId, setRevokingBindingId] = useState<string | null>(null)
  const [bindingToRevoke, setBindingToRevoke] = useState<string | null>(null)
  const [overview, setOverview] = useState<OverviewResponse | null>(null)
  const [branchExperience, setBranchExperience] = useState<BranchTrackingExperience | null>(null)
  const [branchExperienceLoading, setBranchExperienceLoading] = useState(false)
  const [trackingSelection, setTrackingSelection] = useState<TrackingSelection>({ type: null, id: null })
  const activeTab = overviewTab
  const setActiveTab = setOverviewTab

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
    }, resolvedBranchId ? 5000 : 15000)

    return () => clearInterval(interval)
  }, [canLoad, loadOverview, resolvedBranchId])

  useEffect(() => {
    if (!canLoadBranchExperience) return
    const interval = setInterval(() => {
      void loadBranchExperience(true)
    }, 30000)

    return () => clearInterval(interval)
  }, [canLoadBranchExperience, loadBranchExperience])

  useEffect(() => {
    if (!resolvedBranchId) return

    const source = new EventSource(`/api/vehicles/locations/websocket?branchId=${encodeURIComponent(resolvedBranchId)}`)

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload?.type !== "bus_locations" || !Array.isArray(payload?.data)) {
          return
        }

        const nextLiveVehicles = payload.data as Record<string, any>[]

        setBranchExperience((current) => {
          if (!current) return current
          return {
            ...current,
            liveVehicles: nextLiveVehicles as Record<string, any>[],
          }
        })
      } catch {
        // Ignore malformed SSE payloads
      }
    }

    return () => {
      source.close()
    }
  }, [resolvedBranchId])

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

  const confirmBindingRevoke = useCallback(async () => {
    if (!bindingToRevoke) return
    await handleRevokeBinding(bindingToRevoke)
    setBindingToRevoke(null)
  }, [bindingToRevoke, handleRevokeBinding])

  const selectedBindingToRevoke = useMemo(
    () => overview?.bindings.find((binding) => binding._id === bindingToRevoke) || null,
    [bindingToRevoke, overview?.bindings],
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

  const sourceAvailability = useMemo(() => {
    return TRACKING_PROVIDERS.reduce(
      (acc, provider) => {
        const liveCount = overview?.liveVehicles.filter((item) => item.provider === provider).length || 0
        acc[provider] =
          liveCount > 0 ||
          (overview?.summary.providerVehicleCounts[provider] || 0) > 0 ||
          (overview?.summary.activeBindingCounts[provider] || 0) > 0 ||
          (overview?.summary.providerEnabledBranches[provider] || 0) > 0
        return acc
      },
      { athar: false, mobile_app: false, traccar: false } as Record<TrackingProvider, boolean>,
    )
  }, [overview])

  const defaultSourceView = useMemo<TrackingSourceView>(() => {
    for (const provider of TRACKING_PROVIDERS) {
      if (sourceAvailability[provider]) {
        return provider
      }
    }
    return "overview"
  }, [sourceAvailability])

  const sourceMetrics = useMemo(() => {
    return TRACKING_PROVIDERS.reduce(
      (acc, provider) => {
        const liveItems = overview?.liveVehicles.filter((item) => item.provider === provider) || []
        acc[provider] = {
          liveItems,
          totalVehicles: overview?.summary.providerVehicleCounts[provider] || 0,
          activeBindings: overview?.summary.activeBindingCounts[provider] || 0,
          primaryBindings: overview?.summary.primaryBindingCounts[provider] || 0,
          enabledBranches: overview?.summary.providerEnabledBranches[provider] || 0,
          moving: liveItems.filter((item) => item.connectivityStatus === "moving").length,
          stopped: liveItems.filter((item) => item.connectivityStatus === "stopped").length,
          offline: liveItems.filter((item) => item.connectivityStatus === "offline").length,
        }
        return acc
      },
      {} as Record<
        TrackingProvider,
        {
          liveItems: OverviewResponse["liveVehicles"]
          totalVehicles: number
          activeBindings: number
          primaryBindings: number
          enabledBranches: number
          moving: number
          stopped: number
          offline: number
        }
      >,
    )
  }, [overview])

  useEffect(() => {
    setSourceViewInitialized(false)
  }, [resolvedBranchId, resolvedOrganizationId])

  useEffect(() => {
    if (typeof window === "undefined" || !overview || sourceViewInitialized) return

    const storedSourceView = window.localStorage.getItem(TRACKING_SOURCE_STORAGE_KEY) as TrackingSourceView | null
    const nextSourceView =
      storedSourceView &&
      (storedSourceView === "overview" || sourceAvailability[storedSourceView as TrackingProvider])
        ? storedSourceView
        : defaultSourceView

    setSourceView(nextSourceView)
    setSourceViewInitialized(true)
  }, [defaultSourceView, overview, sourceAvailability, sourceViewInitialized])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(TRACKING_SOURCE_STORAGE_KEY, sourceView)
  }, [sourceView])

  useEffect(() => {
    if (sourceView !== "overview" && !sourceAvailability[sourceView]) {
      setSourceView(defaultSourceView)
    }
  }, [defaultSourceView, sourceAvailability, sourceView])

  useEffect(() => {
    if (sourceView !== "athar" && mapTab === "objects") {
      setMapTab("live")
    }
  }, [mapTab, sourceView])

  const renderSourceWorkspace = useCallback(
    (provider: TrackingProvider) => {
      const metrics = sourceMetrics[provider]
      const branchLiveVehicles = (branchExperience?.liveVehicles || []).filter(
        (item: any) => item?.provider === provider,
      )

      if (!resolvedBranchId) {
        return (
          <EmptyState
            text={`اختر ${labels.branchLabel || "الفرع"} الواحد الذي تريد متابعته لفتح ${getSourceViewLabel(provider)} بخريطة مباشرة ولوحة تفاصيل واضحة.`}
          />
        )
      }

      if (branchExperienceLoading && !branchExperience) {
        return <Loading text={`جارٍ تجهيز ${getSourceViewLabel(provider)}...`} />
      }

      if (!branchExperience?.branch) {
        return <EmptyState text={`تعذر تحميل بيانات ${getSourceViewLabel(provider)} لهذا النطاق.`} />
      }

      return (
        <div className="space-y-4">
          {/* Provider workspace header */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <div>
              <p className="text-sm font-medium">{getSourceViewLabel(provider)}</p>
              <p className="text-xs text-muted-foreground">{getSourceViewDescription(provider)}</p>
            </div>
            {metrics.enabledBranches > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {metrics.enabledBranches} فرع مفعّل
              </span>
            )}
          </div>

          {/* Provider KPI strip */}
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCardBox
              title={`مركبات ${getProviderLabel(provider)}`}
              value={metrics.totalVehicles}
              subtitle="ضمن النطاق"
            />
            <SummaryCardBox
              title="ربوط نشطة"
              value={metrics.activeBindings}
              subtitle={`${metrics.primaryBindings} أساسي`}
            />
            <SummaryCardBox
              title="متحركة الآن"
              value={metrics.moving}
              subtitle={`${metrics.liveItems.length} نشط إجمالاً`}
              accent="success"
            />
            <SummaryCardBox
              title="غير متصلة"
              value={metrics.offline}
              subtitle={`${metrics.stopped} متوقفة`}
              accent={metrics.offline > 0 ? "danger" : "default"}
            />
          </div>

          {metrics.enabledBranches === 0 ? (
            <EmptyState text={`المزوّد ${getProviderLabel(provider)} غير مفعّل حالياً ضمن هذا النطاق.`} />
          ) : null}

          <MunicipalityMap
            municipality={branchExperience.branch as any}
            liveVehicles={branchLiveVehicles as any}
            atharObjects={provider === "athar" ? (branchExperience.objects as any) : []}
            vehicles={branchExperience.vehicles as any}
            routes={branchExperience.routes as any}
            zones={provider === "athar" ? (branchExperience.zones as any) : []}
            points={branchExperience.points as any}
            atharMarkers={provider === "athar" ? (branchExperience.markers as any) : []}
            activeTab={mapTab}
            onTabChange={setMapTab}
            events={branchExperience.events as any}
            trackingSource={provider}
            trackingSourceLabel={getSourceViewLabel(provider)}
            reportsBranchId={resolvedBranchId}
            reportsOrganizationId={resolvedOrganizationId || null}
            defaultRightPanel="live"
            fixedLiveProviderFilter={provider}
            onTrackingSelectionChange={setTrackingSelection}
            onEventClick={(event) => {
              setTrackingSelection({ type: "event", id: event._id })
            }}
          />
        </div>
      )
    },
    [
      branchExperience,
      branchExperienceLoading,
      labels.branchLabel,
      mapTab,
      resolvedBranchId,
      resolvedOrganizationId,
      setTrackingSelection,
      sourceMetrics,
    ],
  )

  return (
    <div className="space-y-4" dir="rtl">
      {/* Scope filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {(userIsAdmin || (userIsOrgAdmin && !sessionBranchId)) && (
            <>
              {userIsAdmin && (
                <Select value={selectedOrganizationId} onValueChange={setSelectedOrganizationId}>
                  <SelectTrigger className="h-8 w-[180px] text-xs">
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
              )}
              <Select
                value={selectedBranchId || "all"}
                onValueChange={(value) => setSelectedBranchId(value === "all" ? "" : value)}
                disabled={userIsAdmin && !selectedOrganizationId}
              >
                <SelectTrigger className="h-8 w-[200px] text-xs">
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
              {resolvedBranchId && (
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  عرض فرع واحد
                </span>
              )}
            </>
          )}
          {trackingSelection.type && (
            <span className="text-xs text-muted-foreground">
              محدد: {trackingSelection.type === "vehicle" ? "مركبة" : "حدث"}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => void manualRefresh()}
          disabled={loading || refreshing || branchExperienceLoading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      {!canLoad ? (
        <EmptyState text="يرجى تحديد المؤسسة أولاً لتحميل بيانات التتبع." />
      ) : loading && !overview ? (
        <Loading text="جارٍ تحميل لوحة التتبع..." />
      ) : !overview ? (
        <EmptyState text="لا توجد بيانات متاحة ضمن هذا النطاق." />
      ) : (
        <>
          <Tabs value={sourceView} onValueChange={(value) => setSourceView(value as TrackingSourceView)} dir="rtl">
            {/* Source selector — compact pill strip */}
            <div className="rounded-xl border border-border bg-card p-1">
              <TabsList className="flex h-auto w-full gap-1 bg-transparent p-0">
                {([...TRACKING_PROVIDERS, "overview"] as TrackingSourceView[]).map((view) => {
                  const metrics = view === "overview" ? null : sourceMetrics[view as TrackingProvider]
                  const liveCount = view === "overview" ? overview.summary.liveConnectivityCounts.moving : metrics!.moving
                  const totalCount =
                    view === "overview"
                      ? overview.summary.totalVehicles
                      : metrics!.liveItems.length > 0
                        ? metrics!.liveItems.length
                        : metrics!.totalVehicles
                  const hasLive = liveCount > 0

                  return (
                    <TabsTrigger
                      key={view}
                      value={view}
                      className="flex flex-1 items-center justify-between gap-2 rounded-lg px-3 py-2 text-right transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:hover:bg-muted"
                    >
                      <span className="text-sm font-medium">{getSourceViewLabel(view)}</span>
                      <span className="flex items-center gap-1.5">
                        {hasLive && view !== "overview" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px] shadow-emerald-400/80" />
                        )}
                        <span className="rounded-full bg-background/20 px-1.5 py-0.5 text-xs tabular-nums">
                          {totalCount}
                        </span>
                      </span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </div>

            {TRACKING_PROVIDERS.map((provider) => (
              <TabsContent key={provider} value={provider} className="mt-4 space-y-4">
                {renderSourceWorkspace(provider)}
              </TabsContent>
            ))}

            <TabsContent value="overview" className="mt-3 space-y-4">
              {/* KPI strip */}
              <div className="flex flex-wrap items-stretch gap-0 rounded-xl border border-border bg-card py-4">
                <SummaryCard
                  title={`إجمالي ${labels.vehicleLabel || "المركبات"}`}
                  value={overview.summary.totalVehicles}
                  subtitle={`${overview.summary.branchCount} ${overview.summary.branchCount === 1 ? "فرع" : "فروع"}`}
                />
                <SummaryCard
                  title="الربوط النشطة"
                  value={activeBindingTotal}
                  subtitle={`أثر ${overview.summary.activeBindingCounts.athar} · GPS ${overview.summary.activeBindingCounts.mobile_app}`}
                />
                <SummaryCard
                  title="متحركة الآن"
                  value={overview.summary.liveConnectivityCounts.moving}
                  subtitle="نشطة"
                  accent="success"
                />
                <SummaryCard
                  title="متوقفة"
                  value={overview.summary.liveConnectivityCounts.stopped}
                  subtitle="لا حركة"
                  accent="warning"
                />
                <SummaryCard
                  title="غير متصلة"
                  value={overview.summary.liveConnectivityCounts.offline}
                  subtitle="منقطعة"
                  accent="danger"
                />
                <SummaryCard
                  title="رسائل / 24س"
                  value={overview.summary.ingressLast24h.total}
                  subtitle={`${overview.summary.ingressLast24h.error} أخطاء`}
                  accent={overview.summary.ingressLast24h.error > 0 ? "danger" : "default"}
                />
              </div>

              {/* Provider summary row */}
              <div className="grid gap-2 md:grid-cols-3">
                {TRACKING_PROVIDERS.map((provider) => {
                  const enabled = overview.summary.providerEnabledBranches[provider] > 0
                  return (
                    <div key={provider} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${enabled ? "bg-emerald-500" : "bg-slate-600"}`} />
                        <span className="text-sm font-medium">{getProviderLabel(provider)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                        <span>{overview.summary.providerVehicleCounts[provider]} مركبة</span>
                        <span className="text-border">·</span>
                        <span>{overview.summary.activeBindingCounts[provider]} ربط</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <Tabs value={overviewTab} onValueChange={setOverviewTab}>
                <TabsList className="mb-3 flex h-9 w-fit gap-0 rounded-lg border border-border bg-card p-1">
                  <TabsTrigger value="map" className="rounded-md px-3 text-xs">خريطة النطاق</TabsTrigger>
                  <TabsTrigger value="live" className="rounded-md px-3 text-xs">الحالة الحية</TabsTrigger>
                  <TabsTrigger value="bindings" className="rounded-md px-3 text-xs">الربوط</TabsTrigger>
                  <TabsTrigger value="messages" className="rounded-md px-3 text-xs">الدفعات</TabsTrigger>
                  <TabsTrigger value="providers" className="rounded-md px-3 text-xs">المزودات</TabsTrigger>
                </TabsList>

                <TabsContent value="map" className="space-y-4">
                  {!resolvedBranchId ? (
                    <EmptyState text={`اختر ${labels.branchLabel || "فرعًا"} واحدًا لعرض خريطة النطاق التفصيلية.`} />
                  ) : branchExperienceLoading && !branchExperience ? (
                    <Loading text="جارٍ تجهيز خريطة النطاق..." />
                  ) : !branchExperience?.branch ? (
                    <EmptyState text="تعذر تحميل بيانات الخريطة لهذا الفرع." />
                  ) : (
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
                      trackingSource="all"
                      trackingSourceLabel="مركز المراقبة"
                      reportsBranchId={resolvedBranchId}
                      reportsOrganizationId={resolvedOrganizationId || null}
                      defaultRightPanel="live"
                      onTrackingSelectionChange={setTrackingSelection}
                    />
                  )}
                </TabsContent>

                <TabsContent value="live">
                  <Card>
                    <CardHeader>
                      <CardTitle>الحالة الحية للمركبات</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {liveVehicles.length === 0 ? <EmptyState text="لا توجد حالات حية ضمن النطاق الحالي." /> : null}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="bindings">
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    {overview.bindings.length === 0 ? (
                      <div className="p-4"><EmptyState text="لا توجد ربوط تتبع ضمن النطاق الحالي." /></div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/40 text-right">
                              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">{labels.vehicleLabel || "المركبة"}</th>
                              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">المزوّد</th>
                              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">الجهاز</th>
                              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">آخر ظهور</th>
                              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">الحالة</th>
                              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {overview.bindings.map((binding) => (
                              <tr key={binding._id} className="transition-colors hover:bg-muted/30">
                                <td className="px-4 py-3">
                                  <div className="font-medium">{binding.vehicleName}</div>
                                  <div className="text-xs text-muted-foreground">{binding.plateNumber || binding.branchName}</div>
                                </td>
                                <td className="px-4 py-3 text-sm">{binding.providerLabel}</td>
                                <td className="px-4 py-3 text-sm text-muted-foreground">{binding.deviceName || "—"}</td>
                                <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{formatDateTime(binding.lastSeenAt)}</td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                      binding.isActive
                                        ? "bg-emerald-500/10 text-emerald-600"
                                        : "bg-slate-500/10 text-slate-500"
                                    }`}
                                  >
                                    <span className={`h-1.5 w-1.5 rounded-full ${binding.isActive ? "bg-emerald-500" : "bg-slate-500"}`} />
                                    {binding.isActive ? "نشط" : "متوقف"}
                                    {binding.isPrimary ? " · أساسي" : ""}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                    onClick={() => setBindingToRevoke(binding._id)}
                                    disabled={revokingBindingId === binding._id}
                                  >
                                    {revokingBindingId === binding._id ? "جارٍ..." : "إبطال"}
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="messages">
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    {overview.recentMessages.length === 0 ? (
                      <div className="p-4"><EmptyState text="لا توجد رسائل تتبع واردة ضمن النطاق الحالي." /></div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/40 text-right">
                              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">وقت الوصول</th>
                              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">المزوّد</th>
                              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">{labels.vehicleLabel || "المركبة"}</th>
                              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">الحالة</th>
                              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground tabular-nums">الدفعة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {overview.recentMessages.map((message) => (
                              <tr key={message._id} className="transition-colors hover:bg-muted/30">
                                <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{formatDateTime(message.receivedAt)}</td>
                                <td className="px-4 py-3 text-sm">{message.providerLabel}</td>
                                <td className="px-4 py-3">
                                  <div className="text-sm">{message.vehicleName || "—"}</div>
                                  <div className="text-xs text-muted-foreground">{message.branchName}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getIngressStatusClasses(message.status)}`}>
                                    {message.status === "processed" ? "معالجة"
                                      : message.status === "duplicate" ? "مكررة"
                                      : message.status === "ignored_late" ? "متأخرة"
                                      : message.status === "rejected" ? "مرفوضة"
                                      : message.status === "error" ? "خطأ"
                                      : "مستلمة"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{message.batchSize ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="providers">
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    {overview.branchProviders.length === 0 ? (
                      <div className="p-4"><EmptyState text="لا توجد إعدادات مزودات ضمن النطاق الحالي." /></div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/40 text-right">
                              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">{labels.branchLabel || "الفرع"}</th>
                              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">أثر</th>
                              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">GPS</th>
                              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Traccar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {overview.branchProviders.map((branch) => (
                              <tr key={branch.branchId} className="transition-colors hover:bg-muted/30">
                                <td className="px-4 py-3 font-medium">{branch.branchName}</td>
                                {TRACKING_PROVIDERS.map((provider) => {
                                  const providerState = branch.providers[provider]
                                  return (
                                    <td key={provider} className="px-4 py-3">
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                          providerState.enabled
                                            ? "bg-emerald-500/10 text-emerald-600"
                                            : "bg-slate-500/10 text-slate-500"
                                        }`}
                                      >
                                        <span className={`h-1.5 w-1.5 rounded-full ${providerState.enabled ? "bg-emerald-500" : "bg-slate-500"}`} />
                                        {providerState.enabled ? "مفعّل" : "معطّل"}
                                      </span>
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>

          <ConfirmationDialog
            open={Boolean(bindingToRevoke)}
            onOpenChange={(open) => {
              if (!open) setBindingToRevoke(null)
            }}
            title="إبطال ربط التتبع"
            description={
              selectedBindingToRevoke
                ? `سيتم إيقاف استقبال التتبع للمركبة ${selectedBindingToRevoke.vehicleName} من ${selectedBindingToRevoke.providerLabel}.`
                : "سيتم إيقاف استقبال التتبع لهذا الربط."
            }
            confirmLabel="إبطال الربط"
            cancelLabel="إلغاء"
            onConfirm={confirmBindingRevoke}
            loading={Boolean(bindingToRevoke && revokingBindingId === bindingToRevoke)}
            variant="destructive"
          />
        </>
      )}
    </div>
  )

  /*
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
                            <tr key={item.trackingKey || `${item.vehicleId}:${item.provider}`} className="border-b align-top">
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
  */
}
