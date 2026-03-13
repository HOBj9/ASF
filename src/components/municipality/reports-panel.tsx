"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLabels } from "@/hooks/use-labels"

type ReportsPanelProps = {
  isSystemAdmin?: boolean
  isOrganizationAdmin?: boolean
}

type BranchOption = {
  _id: string
  name: string
}

type NamedOption = {
  _id: string
  name: string
}

type PreviewResponse = {
  meta: {
    branchId: string
    period: string
    from: string
    to: string
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  headers: string[]
  rows: Array<Record<string, string | number | null>>
  summary: {
    totalVisits: number
    openVisits: number
    closedVisits: number
    uniqueVehicles: number
    uniquePoints: number
    totalDurationSeconds: number
    averageDurationSeconds: number
  }
}

type ColumnKey =
  | "vehicleName"
  | "plateNumber"
  | "pointName"
  | "entryTime"
  | "exitTime"
  | "duration"
  | "zoneId"
  | "status"

const PERIOD_OPTIONS = [
  { value: "daily", label: "يومي" },
  { value: "weekly", label: "أسبوعي" },
  { value: "monthly", label: "شهري" },
  { value: "custom", label: "من - إلى" },
] as const

const STATUS_OPTIONS = [
  { value: "all", label: "الكل" },
  { value: "closed", label: "الزيارات المغلقة" },
  { value: "open", label: "الزيارات المفتوحة" },
] as const

const DURATION_OPTIONS = [
  { value: "seconds", label: "بالثواني" },
  { value: "minutes", label: "بالدقائق" },
  { value: "hours", label: "بالساعات" },
] as const

export function ReportsPanel({ isSystemAdmin = false, isOrganizationAdmin = false }: ReportsPanelProps) {
  const searchParams = useSearchParams()
  const { labels } = useLabels()
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "custom">("daily")
  const [status, setStatus] = useState<"all" | "open" | "closed">("all")
  const [durationUnit, setDurationUnit] = useState<"seconds" | "minutes" | "hours">("seconds")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [vehicleId, setVehicleId] = useState("")
  const [pointId, setPointId] = useState("")
  const [page, setPage] = useState(1)

  const [branches, setBranches] = useState<BranchOption[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState("")
  const [vehicles, setVehicles] = useState<NamedOption[]>([])
  const [points, setPoints] = useState<NamedOption[]>([])

  const [loadingOptions, setLoadingOptions] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [error, setError] = useState("")
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [vehicleParamApplied, setVehicleParamApplied] = useState(false)

  const columnOptions: Array<{ key: ColumnKey; label: string }> = useMemo(
    () => [
      { key: "vehicleName", label: `اسم ${labels.vehicleLabel}` },
      { key: "plateNumber", label: "رقم اللوحة" },
      { key: "pointName", label: `اسم ${labels.pointLabel}` },
      { key: "entryTime", label: "وقت الدخول" },
      { key: "exitTime", label: "وقت الخروج" },
      { key: "duration", label: "مدة البقاء" },
      { key: "zoneId", label: "معرف المنطقة" },
      { key: "status", label: "الحالة" },
    ],
    [labels.pointLabel, labels.vehicleLabel]
  )

  const [selectedColumns, setSelectedColumns] = useState<ColumnKey[]>([
    "vehicleName",
    "plateNumber",
    "pointName",
    "entryTime",
    "exitTime",
    "duration",
    "status",
  ])

  const durationSummaryLabel =
    durationUnit === "hours" ? "ساعة" : durationUnit === "minutes" ? "دقيقة" : "ثانية"

  function convertSummaryDuration(seconds: number) {
    if (durationUnit === "hours") return (seconds / 3600).toFixed(2)
    if (durationUnit === "minutes") return (seconds / 60).toFixed(2)
    return String(seconds)
  }

  const showBranchSelector = isSystemAdmin || isOrganizationAdmin

  useEffect(() => {
    if (isSystemAdmin) {
      fetch("/api/municipalities")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const list = Array.isArray(data?.branches) ? data.branches : []
          setBranches(
            list.map((item: any) => ({
              _id: String(item._id),
              name: String(item.name || item.nameAr || "فرع"),
            }))
          )
        })
        .catch(() => null)
      return
    }
    if (isOrganizationAdmin) {
      fetch("/api/branches")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const list = Array.isArray(data?.branches) ? data.branches : []
          setBranches(
            list.map((item: any) => ({
              _id: String(item._id),
              name: String(item.name || item.nameAr || "فرع"),
            }))
          )
        })
        .catch(() => null)
    }
  }, [isSystemAdmin, isOrganizationAdmin])

  useEffect(() => {
    if (vehicleParamApplied) return
    const paramVehicleId = searchParams.get("vehicleId")
    if (paramVehicleId) {
      setVehicleId(paramVehicleId)
    }
    setVehicleParamApplied(true)
  }, [searchParams, vehicleParamApplied])

  const branchParam = showBranchSelector && selectedBranchId ? selectedBranchId : ""

  useEffect(() => {
    if (showBranchSelector && !selectedBranchId) {
      setVehicles([])
      setPoints([])
      return
    }

    const params = new URLSearchParams()
    if (branchParam) params.set("branchId", branchParam)

    setLoadingOptions(true)
    Promise.all([
      fetch(`/api/vehicles${params.toString() ? `?${params.toString()}` : ""}`)
        .then((res) => (res.ok ? res.json() : { vehicles: [] }))
        .catch(() => ({ vehicles: [] })),
      fetch(`/api/points${params.toString() ? `?${params.toString()}` : ""}`)
        .then((res) => (res.ok ? res.json() : { points: [] }))
        .catch(() => ({ points: [] })),
    ])
      .then(([vehiclesData, pointsData]) => {
        const v = Array.isArray(vehiclesData?.vehicles) ? vehiclesData.vehicles : []
        const p = Array.isArray(pointsData?.points) ? pointsData.points : []

        setVehicles(
          v.map((item: any) => ({ _id: String(item._id), name: String(item.name || item.plateNumber || "مركبة") }))
        )
        setPoints(
          p.map((item: any) => ({ _id: String(item._id), name: String(item.nameAr || item.name || "نقطة") }))
        )
      })
      .finally(() => setLoadingOptions(false))
  }, [branchParam, showBranchSelector, selectedBranchId])

  function toggleColumn(key: ColumnKey) {
    setSelectedColumns((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev
        return prev.filter((item) => item !== key)
      }
      return [...prev, key]
    })
  }

  const buildParams = useCallback((extra?: { page?: number; pageSize?: number }) => {
    const params = new URLSearchParams()
    if (showBranchSelector && selectedBranchId) params.set("branchId", selectedBranchId)
    params.set("period", period)
    params.set("status", status)
    params.set("durationUnit", durationUnit)
    params.set("columns", selectedColumns.join(","))

    if (vehicleId) params.set("vehicleId", vehicleId)
    if (pointId) params.set("pointId", pointId)

    if (period === "custom") {
      if (from) params.set("from", from)
      if (to) params.set("to", to)
    }

    if (extra?.page) params.set("page", String(extra.page))
    if (extra?.pageSize) params.set("pageSize", String(extra.pageSize))

    return params
  }, [durationUnit, period, pointId, selectedBranchId, selectedColumns, showBranchSelector, status, to, from, vehicleId])

  async function loadPreview(nextPage = 1) {
    if (isSystemAdmin && !selectedBranchId) {
      setError("يرجى اختيار الفرع أولاً")
      return
    }

    if (period === "custom" && (!from || !to)) {
      setError("يرجى اختيار تاريخ من وإلى للفترة المخصصة")
      return
    }

    setError("")
    setLoadingPreview(true)
    setPage(nextPage)

    try {
      const params = buildParams({ page: nextPage, pageSize: 20 })
      const response = await fetch(`/api/reports/preview?${params.toString()}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "تعذر تحميل المعاينة")
      }
      setPreview(data)
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء تحميل المعاينة")
      setPreview(null)
    } finally {
      setLoadingPreview(false)
    }
  }

  const exportUrl = useMemo(() => {
    if (isSystemAdmin && !selectedBranchId) return ""
    if (period === "custom" && (!from || !to)) return ""
    const params = buildParams()
    return `/api/reports/export?${params.toString()}`
  }, [
    buildParams,
    isSystemAdmin,
    selectedBranchId,
    period,
    from,
    to,
  ])

  return (
    <Card className="text-right">
      <CardHeader>
        <CardTitle>التقارير المتقدمة</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {showBranchSelector && (
            <div className="space-y-1">
              <label className="text-sm">
                الفرع {isOrganizationAdmin && <span className="text-muted-foreground">(اختياري - بدون اختيار يُخرج التقرير على مستوى المؤسسة)</span>}
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value)
                  setVehicleId("")
                  setPointId("")
                  setPreview(null)
                }}
                className="w-full rounded-lg border bg-background px-3 py-2"
              >
                <option value="">{isOrganizationAdmin ? "كل المؤسسة" : "اختر الفرع"}</option>
                {branches.map((branch) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm">الفترة</label>
              <select value={period} onChange={(e) => setPeriod(e.target.value as any)} className="w-full rounded-lg border bg-background px-3 py-2">
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm">حالة الزيارة</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full rounded-lg border bg-background px-3 py-2">
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm">وحدة مدة البقاء</label>
              <select value={durationUnit} onChange={(e) => setDurationUnit(e.target.value as any)} className="w-full rounded-lg border bg-background px-3 py-2">
                {DURATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {period === "custom" && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm">من تاريخ</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2" />
              </div>
              <div className="space-y-1">
                <label className="text-sm">إلى تاريخ</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2" />
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm">{labels.vehicleLabel} محددة (اختياري)</label>
              <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2" disabled={loadingOptions}>
                <option value="">كل {labels.vehicleLabel}</option>
                {vehicles.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm">{labels.pointLabel} محددة (اختياري)</label>
              <select value={pointId} onChange={(e) => setPointId(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2" disabled={loadingOptions}>
                <option value="">كل {labels.pointLabel}</option>
                {points.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">اختيار الأعمدة</div>
            <div className="grid gap-2 md:grid-cols-4">
              {columnOptions.map((column) => (
                <label key={column.key} className="flex items-center justify-end gap-2 rounded-lg border px-3 py-2 text-sm">
                  <span>{column.label}</span>
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column.key)}
                    onChange={() => toggleColumn(column.key)}
                  />
                </label>
              ))}
            </div>
          </div>

          {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}

          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={() => loadPreview(1)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" disabled={loadingPreview}>
              {loadingPreview ? "جاري التحميل..." : "عرض المعاينة"}
            </button>
            <a
              href={exportUrl || "#"}
              className={`rounded-lg border px-4 py-2 text-sm ${exportUrl ? "hover:bg-muted" : "pointer-events-none opacity-50"}`}
            >
              تصدير Excel
            </a>
          </div>

          {preview && (
            <div className="space-y-3 rounded-xl border p-3">
              <div className="grid gap-2 text-sm md:grid-cols-3">
                <div>إجمالي الزيارات: {preview.summary.totalVisits}</div>
                <div>الزيارات المغلقة: {preview.summary.closedVisits}</div>
                <div>الزيارات المفتوحة: {preview.summary.openVisits}</div>
                <div>عدد {labels.vehicleLabel}: {preview.summary.uniqueVehicles}</div>
                <div>عدد {labels.pointLabel}: {preview.summary.uniquePoints}</div>
                <div>إجمالي المدة ({durationSummaryLabel}): {convertSummaryDuration(preview.summary.totalDurationSeconds)}</div>
                <div>متوسط المدة ({durationSummaryLabel}): {convertSummaryDuration(preview.summary.averageDurationSeconds)}</div>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40">
                      {preview.headers.map((header) => (
                        <th key={header} className="border-b px-3 py-2 text-right font-semibold">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.length === 0 ? (
                      <tr>
                        <td colSpan={preview.headers.length} className="px-3 py-5 text-center text-muted-foreground">
                          لا يوجد بيانات ضمن الفلاتر المحددة
                        </td>
                      </tr>
                    ) : (
                      preview.rows.map((row, index) => (
                        <tr key={index} className="border-b last:border-b-0">
                          {preview.headers.map((header) => (
                            <td key={`${header}-${index}`} className="px-3 py-2">
                              {row[header] ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span>
                  صفحة {preview.meta.page} من {preview.meta.totalPages} - الإجمالي {preview.meta.total}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadPreview(page - 1)}
                    disabled={loadingPreview || page <= 1}
                    className="rounded-lg border px-3 py-1 disabled:opacity-50"
                  >
                    السابق
                  </button>
                  <button
                    onClick={() => loadPreview(page + 1)}
                    disabled={loadingPreview || page >= preview.meta.totalPages}
                    className="rounded-lg border px-3 py-1 disabled:opacity-50"
                  >
                    التالي
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
