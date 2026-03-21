"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import toast from "react-hot-toast"
import { apiClient } from "@/lib/api/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { isAdmin, isOrganizationAdmin } from "@/lib/permissions"
import { useBranches } from "@/hooks/queries/use-branches"

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
  baseUnitId?: string | null
}

type Unit = {
  _id: string
  name: string
  nameAr?: string
  symbol?: string
}

type Stock = {
  _id: string
  materialId: string
  quantity: number
}

type Transaction = {
  _id: string
  materialId: string
  type: "in" | "out" | "adjust"
  quantity: number
  unitId?: string | null
  quantityBase: number
  deltaBase: number
  balanceAfter: number
  note?: string | null
  createdAt: string
}

const transactionTypeOptions = [
  { value: "in", label: "وارد" },
  { value: "out", label: "صادر" },
  { value: "adjust", label: "تسوية" },
] as const

export function PointMaterialsManager() {
  const { data: session } = useSession()
  const [points, setPoints] = useState<Point[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState("")
  const [materials, setMaterials] = useState<Material[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const [selectedPointId, setSelectedPointId] = useState("")
  const [loading, setLoading] = useState(false)

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

  const branchesQuery = useBranches({
    organizationId: null,
    enabled: session !== undefined && canSelectBranch,
  })
  const branches = (branchesQuery.data ?? []) as Branch[]

  useEffect(() => {
    if (canSelectBranch) {
      if (!selectedBranchId) {
        const fallback = sessionBranchId || branches[0]?._id || ""
        if (fallback) setSelectedBranchId(fallback)
      }
    } else if (sessionBranchId) {
      setSelectedBranchId(sessionBranchId)
    }
  }, [branches, canSelectBranch, selectedBranchId, sessionBranchId])

  const [txForm, setTxForm] = useState({
    materialId: "",
    type: "in",
    quantity: "",
    unitId: "",
    note: "",
  })

  const [transferForm, setTransferForm] = useState({
    toPointId: "",
    materialId: "",
    quantity: "",
    unitId: "",
    note: "",
  })

  const materialMap = useMemo(() => new Map(materials.map((m) => [m._id, m])), [materials])
  const unitMap = useMemo(() => new Map(units.map((u) => [u._id, u])), [units])

  const loadPoints = useCallback(async (branchId: string) => {
    const res = await apiClient.get(`/points?branchId=${branchId}`)
    setPoints(res.points || res.data?.points || [])
  }, [])

  const loadMaterials = useCallback(async (branchId: string, pointId: string) => {
    if (!pointId) return
    const res = await apiClient.get(`/materials?branchId=${branchId}&pointId=${pointId}&scope=point`)
    setMaterials(res.materials || res.data?.materials || [])
  }, [])

  const loadUnits = useCallback(async (branchId: string, pointId: string) => {
    if (!pointId) return
    const res = await apiClient.get(`/units?branchId=${branchId}&pointId=${pointId}&scope=point`)
    setUnits(res.units || res.data?.units || [])
  }, [])

  const loadStocks = useCallback(async (branchId: string, pointId: string) => {
    if (!pointId) return
    const res = await apiClient.get(`/material-stocks?branchId=${branchId}&pointId=${pointId}`)
    setStocks(res.stocks || res.data?.stocks || [])
  }, [])

  const loadTransactions = useCallback(async (branchId: string, pointId: string) => {
    if (!pointId) return
    const res = await apiClient.get(`/material-transactions?branchId=${branchId}&pointId=${pointId}&limit=50`)
    setTransactions(res.transactions || res.data?.transactions || [])
  }, [])

  const refreshPointData = useCallback(async (branchId: string, pointId: string) => {
    if (!pointId) return
    await Promise.all([loadStocks(branchId, pointId), loadTransactions(branchId, pointId)])
  }, [loadStocks, loadTransactions])

  useEffect(() => {
    if (!activeBranchId) return
    setLoading(true)
    Promise.all([loadPoints(activeBranchId)])
      .catch((error: any) => toast.error(error.message || "حدث خطأ"))
      .finally(() => setLoading(false))
  }, [activeBranchId, loadPoints])

  useEffect(() => {
    if (!selectedPointId && points.length > 0) {
      setSelectedPointId(points[0]._id)
    }
  }, [points, selectedPointId])

  useEffect(() => {
    if (!selectedPointId) return
    if (!activeBranchId) return
    Promise.all([loadMaterials(activeBranchId, selectedPointId), loadUnits(activeBranchId, selectedPointId)])
      .then(() => refreshPointData(activeBranchId, selectedPointId))
      .catch((error: any) => {
        toast.error(error.message || "حدث خطأ")
      })
  }, [activeBranchId, loadMaterials, loadUnits, refreshPointData, selectedPointId])

  const submitTransaction = async () => {
    if (!activeBranchId) {
      toast.error("يرجى اختيار الفرع")
      return
    }
    if (!selectedPointId) {
      toast.error("اختر نقطة أولاً")
      return
    }
    if (!txForm.materialId) {
      toast.error("اختر مادة")
      return
    }
    const qty = Number(txForm.quantity)
    if (!Number.isFinite(qty) || qty < 0) {
      toast.error("الكمية غير صحيحة")
      return
    }
    if (txForm.type !== "adjust" && qty === 0) {
      toast.error("الكمية يجب أن تكون أكبر من صفر")
      return
    }

    try {
      await apiClient.post("/material-transactions", {
        pointId: selectedPointId,
        materialId: txForm.materialId,
        type: txForm.type,
        quantity: qty,
        unitId: txForm.unitId || null,
        note: txForm.note || null,
        branchId: activeBranchId,
      })
      toast.success("تم تسجيل الحركة")
      setTxForm((prev) => ({ ...prev, quantity: "", note: "" }))
      await refreshPointData(activeBranchId, selectedPointId)
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const submitTransfer = async () => {
    if (!activeBranchId) {
      toast.error("يرجى اختيار الفرع")
      return
    }
    if (!selectedPointId) {
      toast.error("اختر نقطة المصدر أولاً")
      return
    }
    if (!transferForm.toPointId) {
      toast.error("اختر نقطة الوجهة")
      return
    }
    if (transferForm.toPointId === selectedPointId) {
      toast.error("اختر نقطة مختلفة عن نقطة المصدر")
      return
    }
    if (!transferForm.materialId) {
      toast.error("اختر مادة")
      return
    }
    const qty = Number(transferForm.quantity)
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("الكمية غير صحيحة")
      return
    }

    try {
      await apiClient.post("/material-transfers", {
        fromPointId: selectedPointId,
        toPointId: transferForm.toPointId,
        materialId: transferForm.materialId,
        quantity: qty,
        unitId: transferForm.unitId || null,
        note: transferForm.note || null,
        branchId: activeBranchId,
      })
      toast.success("تم التحويل بنجاح")
      setTransferForm((prev) => ({ ...prev, quantity: "", note: "" }))
      await refreshPointData(activeBranchId, selectedPointId)
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

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
                    setSelectedPointId("")
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

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card className="text-right">
          <CardHeader>
            <CardTitle>اختيار النقطة</CardTitle>
          </CardHeader>
        <CardContent className="space-y-3">
          <Select value={selectedPointId} onValueChange={setSelectedPointId}>
            <SelectTrigger className="text-right">
              <SelectValue placeholder="اختر النقطة" />
            </SelectTrigger>
            <SelectContent>
              {points.map((point) => (
                <SelectItem key={point._id} value={point._id}>
                  {point.nameAr || point.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {points.length === 0 && (
            <div className="text-sm text-muted-foreground">لا توجد نقاط بعد.</div>
          )}

          <div className="rounded-lg border p-3 space-y-3">
            <div className="text-sm font-semibold">إضافة حركة مخزون</div>
            <div className="grid gap-2">
              <div>
                <Label>نوع الحركة</Label>
                <Select value={txForm.type} onValueChange={(value) => setTxForm({ ...txForm, type: value as any })}>
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="اختر النوع" />
                  </SelectTrigger>
                  <SelectContent>
                    {transactionTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>المادة</Label>
                <Select
                  value={txForm.materialId}
                  onValueChange={(value) => {
                    const baseUnitId = materialMap.get(value)?.baseUnitId || ""
                    setTxForm((prev) => ({
                      ...prev,
                      materialId: value,
                      unitId: baseUnitId ? String(baseUnitId) : prev.unitId,
                    }))
                  }}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="اختر المادة" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((material) => (
                      <SelectItem key={material._id} value={material._id}>
                        {material.nameAr || material.name} ({material.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الكمية</Label>
                <Input
                  type="number"
                  value={txForm.quantity}
                  onChange={(e) => setTxForm({ ...txForm, quantity: e.target.value })}
                />
              </div>
              <div>
                <Label>الوحدة</Label>
                <Select value={txForm.unitId || "__none__"} onValueChange={(value) => setTxForm({ ...txForm, unitId: value === "__none__" ? "" : value })}>
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="الوحدة (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">بدون</SelectItem>
                    {units.map((unit) => (
                      <SelectItem key={unit._id} value={unit._id}>
                        {unit.nameAr || unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ملاحظة</Label>
                <Input
                  value={txForm.note}
                  onChange={(e) => setTxForm({ ...txForm, note: e.target.value })}
                  placeholder="اختياري"
                />
              </div>
              <Button onClick={submitTransaction} disabled={loading || !selectedPointId}>
                حفظ الحركة
              </Button>
            </div>
          </div>

          <div className="rounded-lg border p-3 space-y-3">
            <div className="text-sm font-semibold">تحويل بين النقاط</div>
            <div className="grid gap-2">
              <div>
                <Label>نقطة الوجهة</Label>
                <Select
                  value={transferForm.toPointId}
                  onValueChange={(value) => setTransferForm({ ...transferForm, toPointId: value })}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="اختر النقطة" />
                  </SelectTrigger>
                  <SelectContent>
                    {points
                      .filter((point) => point._id !== selectedPointId)
                      .map((point) => (
                        <SelectItem key={point._id} value={point._id}>
                          {point.nameAr || point.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>المادة</Label>
                <Select
                  value={transferForm.materialId}
                  onValueChange={(value) => {
                    const baseUnitId = materialMap.get(value)?.baseUnitId || ""
                    setTransferForm((prev) => ({
                      ...prev,
                      materialId: value,
                      unitId: baseUnitId ? String(baseUnitId) : prev.unitId,
                    }))
                  }}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="اختر المادة" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((material) => (
                      <SelectItem key={material._id} value={material._id}>
                        {material.nameAr || material.name} ({material.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الكمية</Label>
                <Input
                  type="number"
                  value={transferForm.quantity}
                  onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })}
                />
              </div>
              <div>
                <Label>الوحدة</Label>
                <Select value={transferForm.unitId || "__none__"} onValueChange={(value) => setTransferForm({ ...transferForm, unitId: value === "__none__" ? "" : value })}>
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="الوحدة (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">بدون</SelectItem>
                    {units.map((unit) => (
                      <SelectItem key={unit._id} value={unit._id}>
                        {unit.nameAr || unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ملاحظة</Label>
                <Input
                  value={transferForm.note}
                  onChange={(e) => setTransferForm({ ...transferForm, note: e.target.value })}
                  placeholder="اختياري"
                />
              </div>
              <Button onClick={submitTransfer} disabled={loading || !selectedPointId}>
                تنفيذ التحويل
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="text-right">
          <CardHeader className="flex-row-reverse items-center justify-between">
            <CardTitle>المخزون الحالي</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => activeBranchId && refreshPointData(activeBranchId, selectedPointId)}
              disabled={!selectedPointId}
            >
              تحديث
            </Button>
          </CardHeader>
          <CardContent>
            {stocks.length === 0 ? (
              <div className="text-sm text-muted-foreground">لا توجد حركات مخزون بعد.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-right">
                      <th className="p-2">المادة</th>
                      <th className="p-2">الكمية</th>
                      <th className="p-2">الوحدة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocks.map((stock) => {
                      const material = materialMap.get(stock.materialId)
                      const unit = material?.baseUnitId ? unitMap.get(String(material.baseUnitId)) : null
                      return (
                        <tr key={stock._id} className="border-b">
                          <td className="p-2">{material?.nameAr || material?.name || stock.materialId}</td>
                          <td className="p-2">{Number(stock.quantity).toFixed(2)}</td>
                          <td className="p-2">{unit?.symbol || unit?.nameAr || unit?.name || "-"}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="text-right">
          <CardHeader>
            <CardTitle>آخر الحركات</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-sm text-muted-foreground">لا توجد حركات بعد.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-right">
                      <th className="p-2">التاريخ</th>
                      <th className="p-2">المادة</th>
                      <th className="p-2">النوع</th>
                      <th className="p-2">الكمية</th>
                      <th className="p-2">الرصيد بعد</th>
                      <th className="p-2">ملاحظة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => {
                      const material = materialMap.get(tx.materialId)
                      const unit = tx.unitId ? unitMap.get(String(tx.unitId)) : null
                      const typeLabel = transactionTypeOptions.find((t) => t.value === tx.type)?.label || tx.type
                      return (
                        <tr key={tx._id} className="border-b">
                          <td className="p-2">{new Date(tx.createdAt).toLocaleString("ar-SA")}</td>
                          <td className="p-2">{material?.nameAr || material?.name || tx.materialId}</td>
                          <td className="p-2">{typeLabel}</td>
                          <td className="p-2">
                            {Number(tx.quantity).toFixed(2)} {unit?.symbol || unit?.nameAr || unit?.name || ""}
                          </td>
                          <td className="p-2">{Number(tx.balanceAfter).toFixed(2)}</td>
                          <td className="p-2">{tx.note || "-"}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}
