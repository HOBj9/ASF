"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import toast from "react-hot-toast"
import { apiClient } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { isAdmin, isOrganizationAdmin } from "@/lib/permissions"
import { Loading } from "@/components/ui/loading"

type Point = {
  _id: string
  name: string
  nameAr?: string
}

type Branch = {
  _id: string
  name: string
  nameAr?: string
}

type Material = {
  _id: string
  name: string
  nameAr?: string
  sku: string
}

type Unit = {
  _id: string
  name: string
  nameAr?: string
  symbol?: string
}

type Transfer = {
  transferId: string
  fromPointId?: string
  toPointId?: string
  materialId?: string
  quantity?: number
  unitId?: string | null
  note?: string | null
  createdAt?: string
}

export function MaterialTransfersManager() {
  const { data: session } = useSession()
  const [points, setPoints] = useState<Point[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState("")
  const [materials, setMaterials] = useState<Material[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState("")
  const [pointFilter, setPointFilter] = useState("")

  const role = session?.user?.role as any
  const userIsAdmin = useMemo(() => {
    if (!role) return false
    if (typeof role === "string") return role === "super_admin"
    return isAdmin(role)
  }, [role])
  const userIsOrgAdmin = useMemo(() => {
    if (!role) return false
    if (typeof role === "string") return role === "organization_admin"
    return isOrganizationAdmin(role)
  }, [role])
  const canSelectBranch = userIsAdmin || userIsOrgAdmin

  const sessionBranchId = (session?.user as any)?.branchId || ""
  const activeBranchId = canSelectBranch ? selectedBranchId : sessionBranchId

  const pointMap = useMemo(() => new Map(points.map((p) => [p._id, p])), [points])
  const materialMap = useMemo(() => new Map(materials.map((m) => [m._id, m])), [materials])
  const unitMap = useMemo(() => new Map(units.map((u) => [u._id, u])), [units])

  const dedupeById = <T extends { _id: string }>(items: T[]) => {
    return Array.from(new Map(items.map((item) => [item._id, item])).values())
  }

  const loadTransfers = async (branchId: string) => {
    const res = await apiClient.get(`/material-transfers?branchId=${branchId}&limit=200`)
    setTransfers(res.transfers || res.data?.transfers || [])
  }

  const loadPointMaterials = async (branchId: string, list: Point[]) => {
    if (!list.length) return []
    const results = await Promise.all(
      list.map((point) =>
        apiClient
          .get(`/materials?branchId=${branchId}&pointId=${point._id}&scope=point`)
          .then((res) => res.materials || res.data?.materials || [])
          .catch(() => [])
      )
    )
    return results.flat()
  }

  const loadPointUnits = async (branchId: string, list: Point[]) => {
    if (!list.length) return []
    const results = await Promise.all(
      list.map((point) =>
        apiClient
          .get(`/units?branchId=${branchId}&pointId=${point._id}&scope=point`)
          .then((res) => res.units || res.data?.units || [])
          .catch(() => [])
      )
    )
    return results.flat()
  }

  useEffect(() => {
    if (canSelectBranch) {
      apiClient
        .get("/branches")
        .then((res: any) => {
          const list = res.branches || res.data?.branches || []
          setBranches(list)
          if (!selectedBranchId) {
            const fallback = sessionBranchId || list[0]?._id || ""
            setSelectedBranchId(fallback)
          }
        })
        .catch((error: any) => toast.error(error.message || "حدث خطأ"))
    } else if (sessionBranchId) {
      setSelectedBranchId(sessionBranchId)
    }
  }, [canSelectBranch, sessionBranchId])

  useEffect(() => {
    if (!activeBranchId) return
    let cancelled = false

    const loadAll = async () => {
      setLoading(true)
      try {
        const pointsRes = await apiClient.get(`/points?branchId=${activeBranchId}`)
        const list = pointsRes.points || pointsRes.data?.points || []
        if (cancelled) return
        setPoints(list)

        const [branchMaterialsRes, branchUnitsRes, pointMaterials, pointUnits] = await Promise.all([
          apiClient.get(`/materials?branchId=${activeBranchId}`),
          apiClient.get(`/units?branchId=${activeBranchId}`),
          loadPointMaterials(activeBranchId, list),
          loadPointUnits(activeBranchId, list),
        ])

        if (cancelled) return
        const branchMaterials = branchMaterialsRes.materials || branchMaterialsRes.data?.materials || []
        const branchUnits = branchUnitsRes.units || branchUnitsRes.data?.units || []
        setMaterials(dedupeById([...branchMaterials, ...pointMaterials]))
        setUnits(dedupeById([...branchUnits, ...pointUnits]))

        await loadTransfers(activeBranchId)
      } catch (error: any) {
        if (!cancelled) toast.error(error.message || "\u062d\u062f\u062b \u062e\u0637\u0623")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadAll()

    return () => {
      cancelled = true
    }
  }, [activeBranchId])

  const filteredTransfers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return transfers.filter((item) => {
      if (pointFilter) {
        if (item.fromPointId !== pointFilter && item.toPointId !== pointFilter) return false
      }
      if (!q) return true
      const material = item.materialId ? materialMap.get(item.materialId) : null
      const fromPoint = item.fromPointId ? pointMap.get(item.fromPointId) : null
      const toPoint = item.toPointId ? pointMap.get(item.toPointId) : null
      const text = [
        material?.nameAr,
        material?.name,
        material?.sku,
        fromPoint?.nameAr,
        fromPoint?.name,
        toPoint?.nameAr,
        toPoint?.name,
        item.note,
        item.transferId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return text.includes(q)
    })
  }, [transfers, search, pointFilter, materialMap, pointMap])

  return (
    <div className="space-y-4">
      {canSelectBranch && (
        <Card className="text-right">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold">اختيار الفرع</span>
              <div className="min-w-[220px]">
                <Select
                  value={selectedBranchId}
                  onValueChange={(value) => {
                    setSelectedBranchId(value)
                    setPointFilter("")
                  }}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="اختر الفرع" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch._id} value={branch._id}>
                        {branch.nameAr || branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {branches.length === 0 && (
                <span className="text-xs text-muted-foreground">لا توجد فروع متاحة.</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="text-right">
        <CardHeader className="flex-row-reverse items-center justify-between">
          <CardTitle>تحويلات المواد بين النقاط</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => activeBranchId && loadTransfers(activeBranchId)}
            disabled={loading}
          >
            تحديث
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder="بحث بالمواد أو النقاط أو الملاحظة"
              value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={pointFilter || "__all__"} onValueChange={(value) => setPointFilter(value === "__all__" ? "" : value)}>
            <SelectTrigger className="text-right">
              <SelectValue placeholder="فلترة حسب نقطة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">كل النقاط</SelectItem>
              {points.map((point) => (
                <SelectItem key={point._id} value={point._id}>
                  {point.nameAr || point.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground flex items-center justify-end">
            إجمالي التحويلات: {filteredTransfers.length}
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-right">
                  <th className="p-2">التاريخ</th>
                  <th className="p-2">المصدر</th>
                  <th className="p-2">الوجهة</th>
                  <th className="p-2">المادة</th>
                  <th className="p-2">الكمية</th>
                  <th className="p-2">ملاحظة</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.map((item) => {
                  const material = item.materialId ? materialMap.get(item.materialId) : null
                  const fromPoint = item.fromPointId ? pointMap.get(item.fromPointId) : null
                  const toPoint = item.toPointId ? pointMap.get(item.toPointId) : null
                  const unit = item.unitId ? unitMap.get(String(item.unitId)) : null
                  return (
                    <tr key={item.transferId} className="border-b">
                      <td className="p-2">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString("ar-SA") : "-"}
                      </td>
                      <td className="p-2">{fromPoint?.nameAr || fromPoint?.name || "-"}</td>
                      <td className="p-2">{toPoint?.nameAr || toPoint?.name || "-"}</td>
                      <td className="p-2">{material?.nameAr || material?.name || "-"}</td>
                      <td className="p-2">
                        {typeof item.quantity === "number" ? item.quantity.toFixed(2) : "-"} {unit?.symbol || unit?.nameAr || unit?.name || ""}
                      </td>
                      <td className="p-2">{item.note || "-"}</td>
                    </tr>
                  )
                })}
                {filteredTransfers.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-muted-foreground" colSpan={6}>
                      لا توجد تحويلات لعرضها
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  )
}

