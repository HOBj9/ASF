"use client"

import { useSession } from "next-auth/react"
import { useMemo, useEffect, useState, useCallback } from "react"
import { apiClient } from "@/lib/api/client"
import { isAdmin, isOrganizationAdmin } from "@/lib/permissions"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MapPinned, Copy, Send, Loader2 } from "lucide-react"

type Creator = { _id: string; name?: string; email?: string } | null

type OrgPoint = {
  _id: string
  name: string
  nameAr?: string
  lat: number
  lng: number
  zoneId?: string
  isActive?: boolean
  createdByUserId?: Creator
}

type BranchPoint = OrgPoint & {
  branchId: { _id: string; name?: string; nameAr?: string }
}

type Organization = { _id: string; name: string }

export function OrganizationPointsManager() {
  const { data: session } = useSession()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState("")
  const [points, setPoints] = useState<OrgPoint[]>([])
  const [branchPoints, setBranchPoints] = useState<BranchPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingBranchPoints, setLoadingBranchPoints] = useState(false)
  const [pushingId, setPushingId] = useState<string | null>(null)
  const [transferring, setTransferring] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const userIsAdmin = useMemo(() => isAdmin(session?.user?.role as any), [session?.user?.role])
  const userIsOrgAdmin = useMemo(() => isOrganizationAdmin(session?.user?.role as any), [session?.user?.role])
  const canCreate = userIsAdmin || userIsOrgAdmin
  const orgId = useMemo(() => {
    if (selectedOrgId) return selectedOrgId
    const sid = (session?.user as any)?.organizationId
    if (sid) return sid
    return ""
  }, [selectedOrgId, session?.user])

  const loadOrganizations = useCallback(async () => {
    try {
      const res: any = await apiClient.get("/organizations").catch(() => ({ organizations: [] }))
      const list = res.organizations || res.data?.organizations || []
      setOrganizations(list)
      if (list.length === 1 && !selectedOrgId) setSelectedOrgId(list[0]._id)
      return list
    } catch {
      return []
    }
  }, [selectedOrgId])

  const loadPoints = useCallback(async (organizationId: string) => {
    if (!organizationId) {
      setPoints([])
      setBranchPoints([])
      return
    }
    setLoading(true)
    try {
      const res: any = await apiClient.get(`organizations/${organizationId}/points`)
      setPoints(res.points || res.data?.points || [])
    } catch (e: any) {
      toast.error(e?.message || "فشل تحميل النقاط")
      setPoints([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadBranchPoints = useCallback(async (organizationId: string) => {
    if (!organizationId) return
    setLoadingBranchPoints(true)
    try {
      const res: any = await apiClient.get(`organizations/${organizationId}/points?scope=branches`)
      setBranchPoints(res.points || res.data?.points || [])
    } catch {
      setBranchPoints([])
    } finally {
      setLoadingBranchPoints(false)
    }
  }, [])

  useEffect(() => {
    if (!session) return
    void loadOrganizations()
  }, [loadOrganizations, session])

  useEffect(() => {
    if (orgId) {
      void loadPoints(orgId)
      if (canCreate) void loadBranchPoints(orgId)
    } else {
      setPoints([])
      setBranchPoints([])
    }
  }, [canCreate, loadBranchPoints, loadPoints, orgId])

  const handlePushToBranches = async (pointId: string) => {
    if (!orgId) return
    setPushingId(pointId)
    try {
      const res: any = await apiClient.post(`organizations/${orgId}/points/push-to-branches`, { pointId })
      toast.success(`تم نسخ النقطة إلى ${res.pushed ?? 0} فرع`)
      loadPoints(orgId)
    } catch (e: any) {
      toast.error(e?.message || "فشل نسخ النقطة")
    } finally {
      setPushingId(null)
    }
  }

  const handleTransferToAthar = async (pointIds?: string[]) => {
    if (!orgId) return
    setTransferring(true)
    try {
      const res: any = await apiClient.post(`organizations/${orgId}/points/transfer-to-athar`, {
        pointIds: pointIds && pointIds.length > 0 ? pointIds : undefined,
      })
      const results = res.results || []
      const ok = results.filter((r: any) => !r.error).length
      const err = results.filter((r: any) => r.error).length
      if (err > 0) toast.error(`فشل نقل ${err} نقطة`)
      if (ok > 0) {
        toast.success(`تم نقل ${ok} نقطة إلى أثر`)
        loadPoints(orgId)
      }
    } catch (e: any) {
      toast.error(e?.message || "فشل النقل إلى أثر")
    } finally {
      setTransferring(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const notTransferredBranchPoints = branchPoints.filter((p) => !p.zoneId || p.zoneId === "")

  return (
    <div className="space-y-6">
      {userIsAdmin && organizations.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">المؤسسة</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedOrgId || orgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="اختر المؤسسة" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((o) => (
                  <SelectItem key={o._id} value={o._id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {orgId && (
        <>
          <div className="flex flex-wrap gap-2">
            {canCreate && notTransferredBranchPoints.length > 0 && (
              <Button
                variant="default"
                onClick={() => handleTransferToAthar()}
                disabled={transferring}
              >
                {transferring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="mr-2">نقل الكل إلى أثر</span>
              </Button>
            )}
            {canCreate && selectedIds.size > 0 && (
              <Button
                variant="secondary"
                onClick={() => handleTransferToAthar(Array.from(selectedIds))}
                disabled={transferring}
              >
                {transferring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="mr-2">نقل المحدد ({selectedIds.size}) إلى أثر</span>
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPinned className="h-5 w-5" />
                قائمة النقاط
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">جاري التحميل...</p>
              ) : points.length === 0 ? (
                <p className="text-muted-foreground">لا توجد نقاط على مستوى المؤسسة.</p>
              ) : (
                <ul className="space-y-2">
                  {points.map((p) => (
                    <li
                      key={p._id}
                      className="flex items-center justify-between gap-4 rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{p.nameAr || p.name}</span>
                        <span className="text-muted-foreground text-sm">
                          {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                        </span>
                        {p.zoneId ? (
                          <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded">
                            منقول لأثر
                          </span>
                        ) : (
                          <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded">
                            غير منقول
                          </span>
                        )}
                        {p.createdByUserId && (
                          <span className="text-xs text-muted-foreground">
                            أضافه: {(p.createdByUserId as Creator)?.name || (p.createdByUserId as Creator)?.email || '—'}
                          </span>
                        )}
                      </div>
                      {canCreate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePushToBranches(p._id)}
                          disabled={!!pushingId}
                        >
                          {pushingId === p._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          <span className="mr-2">في كل الفروع</span>
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {orgId && canCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">نقاط الفروع (للنقل إلى أثر)</CardTitle>
            <p className="text-sm text-muted-foreground">اختر نقاطاً لنقلها إلى أثر أو انقل الكل</p>
          </CardHeader>
          <CardContent>
            {loadingBranchPoints ? (
              <p className="text-muted-foreground">جاري التحميل...</p>
            ) : notTransferredBranchPoints.length === 0 ? (
              <p className="text-muted-foreground">لا توجد نقاط فرعية غير منقولة إلى أثر.</p>
            ) : (
              <ul className="space-y-2">
                {notTransferredBranchPoints.map((p) => {
                  const branch = p.branchId as any
                  const branchName = branch?.nameAr || branch?.name || branch?._id || ''
                  return (
                    <li key={p._id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p._id)}
                          onChange={() => toggleSelect(p._id)}
                          className="h-4 w-4"
                        />
                        <span className="font-medium">{p.nameAr || p.name}</span>
                        <span className="text-muted-foreground text-sm">فرع: {branchName}</span>
                        {p.createdByUserId && (
                          <span className="text-xs text-muted-foreground">
                            أضافه: {(p.createdByUserId as Creator)?.name || (p.createdByUserId as Creator)?.email || '—'}
                          </span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {!orgId && session && !loading && (
        <p className="text-muted-foreground">لا توجد مؤسسة محددة. حدد المؤسسة أو سجّل الدخول بحساب مرتبط بمؤسسة.</p>
      )}
    </div>
  )
}
