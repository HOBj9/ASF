"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import toast from "react-hot-toast"
import { apiClient } from "@/lib/api/client"
import { isAdmin, isOrganizationAdmin, isBranchAdmin } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loading } from "@/components/ui/loading"
import { Copy, Pencil, Trash2 } from "lucide-react"

const DAY_NAMES = [
  { value: 0, label: "الأحد" },
  { value: 1, label: "الإثنين" },
  { value: 2, label: "الثلاثاء" },
  { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" },
  { value: 5, label: "الجمعة" },
  { value: 6, label: "السبت" },
]

type WorkScheduleDay = { dayOfWeek: number; startTime: string; endTime: string }

type DayConfig = { enabled: boolean; startTime: string; endTime: string }

const defaultDayConfig = (): DayConfig => ({ enabled: false, startTime: "08:00", endTime: "16:00" })

type WorkScheduleItem = {
  _id: string
  name: string
  nameAr?: string | null
  order?: number
  days: WorkScheduleDay[]
  source?: "org" | "branch_own" | "branch_override"
  branchId?: string | null
  sourceWorkScheduleId?: string | null
}

type Organization = { _id: string; name: string }
type Branch = { _id: string; name: string; nameAr?: string; organizationId: string }

export function WorkSchedulesManager() {
  const { data: session } = useSession()

  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("")
  const [selectedBranchId, setSelectedBranchId] = useState("")

  const [items, setItems] = useState<WorkScheduleItem[]>([])
  const [loading, setLoading] = useState(false)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<WorkScheduleItem | null>(null)
  const [form, setForm] = useState<{
    name: string
    nameAr: string
    daysByDay: Record<number, DayConfig>
  }>({
    name: "",
    nameAr: "",
    daysByDay: Object.fromEntries(DAY_NAMES.map((d) => [d.value, defaultDayConfig()])),
  })
  const [copyingId, setCopyingId] = useState<string | null>(null)

  const userIsAdmin = useMemo(() => isAdmin(session?.user?.role as any), [session?.user?.role])
  const userIsOrgAdmin = useMemo(() => isOrganizationAdmin(session?.user?.role as any), [session?.user?.role])
  const userIsBranchAdmin = useMemo(() => isBranchAdmin(session?.user?.role as any), [session?.user?.role])
  const sessionBranchId = (session?.user as any)?.branchId ?? null
  const needsBranchSelector = userIsAdmin || (userIsOrgAdmin && !sessionBranchId)
  const resolvedBranchId = needsBranchSelector
    ? (selectedBranchId || null)
    : sessionBranchId
  const branchOrgId = useMemo(() => branches.find((b) => b._id === resolvedBranchId)?.organizationId, [branches, resolvedBranchId])
  const resolvedOrganizationId =
    selectedOrganizationId ||
    (userIsOrgAdmin ? (session?.user as any)?.organizationId : null) ||
    (userIsBranchAdmin ? branchOrgId : null) ||
    (needsBranchSelector && resolvedBranchId ? branchOrgId : null) ||
    ""

  const viewMode = useMemo<"org" | "branch">(() => {
    if (needsBranchSelector && resolvedBranchId) return "branch"
    if (needsBranchSelector && resolvedOrganizationId && !resolvedBranchId) return "org"
    if (userIsBranchAdmin) return "branch"
    if (userIsOrgAdmin && resolvedBranchId) return "branch"
    if (userIsOrgAdmin && resolvedOrganizationId) return "org"
    return "branch"
  }, [needsBranchSelector, resolvedBranchId, resolvedOrganizationId, userIsBranchAdmin, userIsOrgAdmin])

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
    if (!organizationId) { setBranches([]); return }
    try {
      const res = await apiClient.get(`/branches?organizationId=${organizationId}`)
      setBranches(res.branches || res.data?.branches || [])
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

  const load = async () => {
    if (viewMode === "org" && resolvedOrganizationId) {
      setLoading(true)
      try {
        const res: any = await apiClient.get(`/work-schedules?organizationId=${resolvedOrganizationId}`)
        setItems(res.schedules || [])
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    } else if (viewMode === "branch" && resolvedBranchId) {
      setLoading(true)
      try {
        const res: any = await apiClient.get(`/work-schedules?branchId=${resolvedBranchId}`)
        setItems(res.schedules || [])
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    } else {
      setItems([])
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
    }
  }, [session?.user])

  useEffect(() => {
    if (userIsAdmin && selectedOrganizationId) {
      loadBranches(selectedOrganizationId)
      setSelectedBranchId("")
    }
  }, [userIsAdmin, selectedOrganizationId])

  useEffect(() => {
    load()
  }, [viewMode, resolvedOrganizationId, resolvedBranchId])

  const openCreate = () => {
    setEditing(null)
    setForm({
      name: "",
      nameAr: "",
      daysByDay: Object.fromEntries(DAY_NAMES.map((d) => [d.value, defaultDayConfig()])),
    })
    setOpen(true)
  }

  const openEdit = (item: WorkScheduleItem) => {
    setEditing(item)
    const base = Object.fromEntries(DAY_NAMES.map((d) => [d.value, defaultDayConfig()]))
    for (const d of item.days ?? []) {
      if (d.dayOfWeek >= 0 && d.dayOfWeek <= 6) {
        base[d.dayOfWeek] = {
          enabled: true,
          startTime: d.startTime || "08:00",
          endTime: d.endTime || "16:00",
        }
      }
    }
    setForm({
      name: item.name,
      nameAr: item.nameAr || "",
      daysByDay: base,
    })
    setOpen(true)
  }

  const handleCopyToBranch = async (sourceId: string) => {
    if (!resolvedBranchId) return
    setCopyingId(sourceId)
    try {
      await apiClient.post(`/work-schedules/${sourceId}/copy-to-branch`, { branchId: resolvedBranchId })
      toast.success("تم نسخ جدول العمل بنجاح")
      load()
    } catch (err: any) {
      toast.error(err?.message || "فشل النسخ")
    } finally {
      setCopyingId(null)
    }
  }

  const submit = async () => {
    if (!form.name?.trim()) {
      toast.error("الاسم مطلوب")
      return
    }
    const days: WorkScheduleDay[] = DAY_NAMES.filter((d) => form.daysByDay[d.value]?.enabled).map(
      (d) => ({
        dayOfWeek: d.value,
        startTime: form.daysByDay[d.value]?.startTime || "08:00",
        endTime: form.daysByDay[d.value]?.endTime || "16:00",
      })
    )
    if (days.length === 0) {
      toast.error("يرجى تفعيل يوم واحد على الأقل وتحديد أوقات الدوام")
      return
    }

    try {
      if (editing) {
        const payload: any = {
          name: form.name.trim(),
          nameAr: form.nameAr?.trim() || null,
          days,
        }
        if (editing.branchId) payload.branchId = editing.branchId
        else payload.organizationId = resolvedOrganizationId
        await apiClient.patch(`/work-schedules/${editing._id}`, payload)
        toast.success("تم تحديث جدول العمل")
      } else {
        if (viewMode === "org") {
          await apiClient.post("/work-schedules", {
            organizationId: resolvedOrganizationId,
            name: form.name.trim(),
            nameAr: form.nameAr?.trim() || null,
            days,
          })
        } else {
          await apiClient.post("/work-schedules", {
            organizationId: resolvedOrganizationId,
            branchId: resolvedBranchId,
            name: form.name.trim(),
            nameAr: form.nameAr?.trim() || null,
            days,
          })
        }
        toast.success("تم إضافة جدول العمل")
      }
      setOpen(false)
      load()
    } catch (err: any) {
      toast.error(err?.message || "حدث خطأ")
    }
  }

  const remove = async (item: WorkScheduleItem) => {
    if (!confirm(`حذف جدول العمل "${item.name}"؟`)) return
    try {
      const params = item.branchId ? `?branchId=${item.branchId}` : `?organizationId=${resolvedOrganizationId}`
      await apiClient.delete(`/work-schedules/${item._id}${params}`)
      toast.success("تم حذف جدول العمل")
      load()
    } catch (err: any) {
      toast.error(err?.message || "حدث خطأ")
    }
  }

  const updateDayConfig = (dayOfWeek: number, updates: Partial<DayConfig>) => {
    setForm((prev) => ({
      ...prev,
      daysByDay: {
        ...prev.daysByDay,
        [dayOfWeek]: { ...(prev.daysByDay[dayOfWeek] ?? defaultDayConfig()), ...updates },
      },
    }))
  }

  const formatDays = (days: WorkScheduleDay[]) => {
    if (!days?.length) return "-"
    const sorted = [...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    const parts = sorted.map((d) => {
      const label = DAY_NAMES.find((n) => n.value === d.dayOfWeek)?.label || ""
      return `${label} ${d.startTime || ""}-${d.endTime || ""}`
    })
    return parts.join(" | ")
  }

  const canEdit = (item: WorkScheduleItem) => {
    if (viewMode === "org") return !item.branchId
    if (item.source === "branch_own" || item.source === "branch_override") return true
    return false
  }

  const canDelete = canEdit

  const canCopy = (item: WorkScheduleItem) => {
    return viewMode === "branch" && item.source === "org" && !!resolvedBranchId
  }

  return (
    <Card className="text-right">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3 flex-row-reverse">
          <CardTitle>أيام العمل</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {viewMode === "org" && (
              <Button onClick={openCreate}>إضافة جدول</Button>
            )}
            {viewMode === "branch" && (
              <Button onClick={openCreate}>إضافة جدول خاص بالفرع</Button>
            )}
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
            <span className="text-sm text-muted-foreground">الفرع:</span>
            <Select
              value={selectedBranchId || "__org__"}
              onValueChange={(v) => setSelectedBranchId(v === "__org__" ? "" : v)}
              disabled={userIsAdmin && !selectedOrganizationId}
            >
              <SelectTrigger className="w-[220px] text-right">
                <SelectValue placeholder="عرض مستوى المؤسسة (بدون فرع)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__org__">عرض جداول المؤسسة</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b._id} value={b._id}>{b.nameAr || b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!resolvedBranchId && !resolvedOrganizationId && (userIsAdmin || userIsOrgAdmin) && (
              <span className="text-sm text-muted-foreground">يرجى تحديد المؤسسة أو الفرع</span>
            )}
          </div>
        )}

        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">لا توجد جداول عمل</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 font-medium">الاسم</th>
                  <th className="p-3 font-medium">الأيام والمواعيد</th>
                  <th className="p-3 font-medium">النوع</th>
                  <th className="p-3 font-medium w-24">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3">
                      <span className="font-medium">{item.nameAr || item.name}</span>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{formatDays(item.days)}</td>
                    <td className="p-3 text-sm">
                      {item.source === "org" && <span className="text-muted-foreground">موروث من المؤسسة</span>}
                      {item.source === "branch_own" && <span>خاص بالفرع</span>}
                      {item.source === "branch_override" && <span>نسخة معدلة</span>}
                      {!item.source && !item.branchId && <span className="text-muted-foreground">مؤسسة</span>}
                      {!item.source && item.branchId && <span>فرع</span>}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 justify-end">
                        {canCopy(item) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="نسخ وتعديل"
                            disabled={!!copyingId}
                            onClick={() => handleCopyToBranch(item._id)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        {canEdit(item) && (
                          <Button variant="ghost" size="icon" title="تعديل" onClick={() => openEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete(item) && (
                          <Button variant="ghost" size="icon" title="حذف" onClick={() => remove(item)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg text-right">
            <DialogHeader>
              <DialogTitle>{editing ? "تعديل جدول العمل" : "إضافة جدول عمل"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>الاسم</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="مثال: الدورة الصباحية"
                />
              </div>
              <div>
                <Label>الاسم بالعربية (اختياري)</Label>
                <Input
                  value={form.nameAr}
                  onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))}
                  placeholder="مثال: وردية مسائية جزئية"
                />
              </div>
              <div>
                <Label>الأيام وأوقات الدوام (لكل يوم بداية ونهاية خاصة)</Label>
                <div className="mt-2 space-y-2 border rounded-lg p-3 max-h-64 overflow-y-auto">
                  {DAY_NAMES.map((d) => {
                    const cfg = form.daysByDay[d.value] ?? defaultDayConfig()
                    return (
                      <div
                        key={d.value}
                        className="flex flex-wrap items-center gap-3 p-2 rounded-lg bg-muted/30"
                      >
                        <label className="flex items-center gap-2 cursor-pointer min-w-[90px]">
                          <input
                            type="checkbox"
                            checked={cfg.enabled}
                            onChange={(e) => updateDayConfig(d.value, { enabled: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm font-medium">{d.label}</span>
                        </label>
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">من</span>
                            <Input
                              type="time"
                              value={cfg.startTime}
                              onChange={(e) => updateDayConfig(d.value, { startTime: e.target.value })}
                              disabled={!cfg.enabled}
                              className="w-28 h-8 text-sm"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">إلى</span>
                            <Input
                              type="time"
                              value={cfg.endTime}
                              onChange={(e) => updateDayConfig(d.value, { endTime: e.target.value })}
                              disabled={!cfg.enabled}
                              className="w-28 h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button onClick={submit}>{editing ? "حفظ" : "إضافة"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
