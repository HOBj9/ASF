"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { apiClient } from "@/lib/api/client"
import { isAdmin, isOrganizationAdmin } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import toast from "react-hot-toast"
import { useLabels } from "@/hooks/use-labels"
import { useBranches } from "@/hooks/queries/use-branches"
import { useOrganizations } from "@/hooks/queries/use-organizations"
import { Loading } from "@/components/ui/loading"
import { ExportExcelDialog, type ExportColumn } from "@/components/municipality/export-excel-dialog"

type Driver = {
  _id: string
  name: string
  phone?: string
  nationalId?: string
  assignedVehicleId?: string
  isActive: boolean
}

type Vehicle = { _id: string; name: string }
type Organization = { _id: string; name: string }
type Branch = { _id: string; name: string; nameAr?: string; organizationId: string }

const emptyForm: Partial<Driver> = {
  name: "",
  phone: "",
  nationalId: "",
  assignedVehicleId: "",
  isActive: true,
}

export function DriversManager() {
  const PAGE_SIZE = 10
  const { data: session } = useSession()
  const { labels } = useLabels()

  const [items, setItems] = useState<Driver[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])

  const [selectedOrganizationId, setSelectedOrganizationId] = useState("")
  const [selectedBranchId, setSelectedBranchId] = useState("")

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [assignmentFilter, setAssignmentFilter] = useState("all")
  const [page, setPage] = useState(1)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Driver | null>(null)
  const [form, setForm] = useState<Partial<Driver>>(emptyForm)
  const [loading, setLoading] = useState(false)

  const userIsAdmin = useMemo(() => isAdmin(session?.user?.role as any), [session?.user?.role])
  const userIsOrgAdmin = useMemo(() => isOrganizationAdmin(session?.user?.role as any), [session?.user?.role])
  const sessionBranchId = (session?.user as any)?.branchId ?? null
  const needsBranchSelector = userIsAdmin || (userIsOrgAdmin && !sessionBranchId)
  const resolvedBranchId = selectedBranchId || sessionBranchId

  const { data: organizations = [] } = useOrganizations(userIsAdmin)
  const branchesQuery = useBranches({
    organizationId: userIsAdmin ? selectedOrganizationId || null : null,
    enabled:
      session !== undefined &&
      (userIsAdmin ? !!selectedOrganizationId : Boolean(userIsOrgAdmin && !sessionBranchId)),
  })
  const branches = (branchesQuery.data ?? []) as Branch[]

  const userId = (session?.user as any)?.id as string | undefined

  const load = useCallback(async (branchId: string | null) => {
    if (needsBranchSelector && !branchId) {
      setItems([])
      setVehicles([])
      return
    }
    setLoading(true)
    try {
      const suffix = branchId ? `?branchId=${branchId}` : ""
      const [driversRes, vehiclesRes] = await Promise.all([
        apiClient.get(`/drivers${suffix}`),
        apiClient.get(`/vehicles${suffix}`),
      ])
      setItems(driversRes.drivers || driversRes.data?.drivers || [])
      setVehicles(vehiclesRes.vehicles || vehiclesRes.data?.vehicles || [])
    } catch (error: any) {
      toast.error(error.message || "فشل تحميل البيانات")
      setItems([])
      setVehicles([])
    } finally {
      setLoading(false)
    }
  }, [needsBranchSelector])

  useEffect(() => {
    if (!userIsAdmin || organizations.length !== 1 || selectedOrganizationId) return
    setSelectedOrganizationId(organizations[0]._id)
  }, [userIsAdmin, organizations, selectedOrganizationId])

  useEffect(() => {
    if (!userIsOrgAdmin || sessionBranchId || userIsAdmin) return
    if (branches.length === 1 && !selectedBranchId) setSelectedBranchId(branches[0]._id)
  }, [branches, selectedBranchId, sessionBranchId, userIsAdmin, userIsOrgAdmin])

  useEffect(() => {
    if (!userId) return
    if (userIsAdmin) return
    if (userIsOrgAdmin && !sessionBranchId) return
    void load(null)
  }, [load, userId, sessionBranchId, userIsAdmin, userIsOrgAdmin])

  useEffect(() => {
    if (userIsAdmin && selectedOrganizationId) {
      setSelectedBranchId("")
    }
  }, [selectedOrganizationId, userIsAdmin])

  useEffect(() => {
    if (!needsBranchSelector) return
    if (resolvedBranchId) {
      void load(resolvedBranchId)
    }
    else {
      setItems([])
      setVehicles([])
    }
  }, [load, needsBranchSelector, resolvedBranchId])

  useEffect(() => {
    if (!needsBranchSelector && userId) void load(null)
  }, [load, needsBranchSelector, userId])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      if (statusFilter === "active" && !item.isActive) return false
      if (statusFilter === "inactive" && item.isActive) return false

      if (assignmentFilter === "with" && !item.assignedVehicleId) return false
      if (assignmentFilter === "without" && item.assignedVehicleId) return false

      if (!q) return true
      const vehicleName = vehicles.find((v) => v._id === item.assignedVehicleId)?.name || ""
      return `${item.name} ${item.phone || ""} ${item.nationalId || ""} ${vehicleName}`
        .toLowerCase()
        .includes(q)
    })
  }, [items, vehicles, search, statusFilter, assignmentFilter])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredItems.slice(start, start + PAGE_SIZE)
  }, [filteredItems, page])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, assignmentFilter])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm })
    setOpen(true)
  }

  const openEdit = (item: Driver) => {
    setEditing(item)
    setForm({
      ...item,
      phone: item.phone || "",
      nationalId: item.nationalId || "",
      assignedVehicleId: item.assignedVehicleId || "",
    })
    setOpen(true)
  }

  const submit = async () => {
    if (!form.name) {
      toast.error("الاسم مطلوب")
      return
    }
    const payload = { ...form } as Record<string, unknown>
      if (resolvedBranchId) payload.branchId = resolvedBranchId
    try {
      if (editing) {
        await apiClient.patch(`/drivers/${editing._id}`, payload)
        toast.success(`تم تحديث ${labels.driverLabel}`)
      } else {
        await apiClient.post("/drivers", payload as any)
        toast.success(`تم إضافة ${labels.driverLabel}`)
      }
      setOpen(false)
      await load(resolvedBranchId || null)
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const remove = async (item: Driver) => {
    if (!confirm(`حذف ${labels.driverLabel} ${item.name}؟`)) return
    try {
      await apiClient.delete(`/drivers/${item._id}`)
      setItems((prev) => prev.filter((i) => i._id !== item._id))
      toast.success(`تم حذف ${labels.driverLabel}`)
      await load(resolvedBranchId || null)
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const exportColumns: ExportColumn<Driver>[] = useMemo(
    () => [
      { key: "name", label: "الاسم", value: (row) => row.name },
      { key: "phone", label: "الهاتف", value: (row) => row.phone || "-" },
      { key: "nationalId", label: "رقم الهوية", value: (row) => row.nationalId || "-" },
      {
        key: "vehicle",
        label: labels.vehicleLabel,
        value: (row) => vehicles.find((v) => v._id === row.assignedVehicleId)?.name || "-",
      },
      { key: "status", label: "الحالة", value: (row) => (row.isActive ? "مفعل" : "معطل") },
    ],
    [labels.vehicleLabel, vehicles]
  )

  return (
    <Card className="text-right">
      <CardHeader>
        <div className="flex items-center justify-between flex-row-reverse">
          <CardTitle>{labels.driverLabel}</CardTitle>
          <div className="flex items-center gap-2">
            <ExportExcelDialog
              title={`Export ${labels.driverLabel} to Excel`}
              rows={filteredItems}
              columns={exportColumns}
              fileBaseName="drivers"
            />
            <Button onClick={openCreate}>إضافة {labels.driverLabel}</Button>
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
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder={`بحث في ${labels.driverLabel}...`}
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
          <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
            <SelectTrigger className="text-right"><SelectValue placeholder={labels.vehicleLabel} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="with">مرتبط بمركبة</SelectItem>
              <SelectItem value="without">غير مرتبط بمركبة</SelectItem>
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
                  <th className="p-2">الهاتف</th>
                  <th className="p-2">رقم الهوية</th>
                  <th className="p-2">{labels.vehicleLabel}</th>
                  <th className="p-2">الحالة</th>
                  <th className="p-2">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => (
                  <tr key={item._id} className="border-b">
                    <td className="p-2">{item.name}</td>
                    <td className="p-2">{item.phone || "-"}</td>
                    <td className="p-2">{item.nationalId || "-"}</td>
                    <td className="p-2">{vehicles.find((v) => v._id === item.assignedVehicleId)?.name || "-"}</td>
                    <td className="p-2">{item.isActive ? "مفعّل" : "معطّل"}</td>
                    <td className="p-2 space-x-2 space-x-reverse">
                      <Button variant="outline" onClick={() => openEdit(item)}>تعديل</Button>
                      <Button variant="destructive" onClick={() => remove(item)}>حذف</Button>
                    </td>
                  </tr>
                ))}
                {paginatedItems.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-muted-foreground" colSpan={6}>
                      لا توجد نتائج
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border rounded-lg p-2">
          <span className="text-sm text-muted-foreground">
            صفحة {page} من {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
              التالي
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
              السابق
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="text-right">
          <DialogHeader>
            <DialogTitle>{editing ? `تعديل ${labels.driverLabel}` : `إضافة ${labels.driverLabel}`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>الاسم</Label>
              <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>الهاتف</Label>
              <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>رقم الهوية</Label>
              <Input value={form.nationalId || ""} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
            </div>
            <div>
              <Label>{labels.vehicleLabel}</Label>
              <Select value={form.assignedVehicleId || "__none__"} onValueChange={(value) => setForm({ ...form, assignedVehicleId: value === "__none__" ? "" : value })}>
                <SelectTrigger className="text-right">
                  <SelectValue placeholder={`اختيار ${labels.vehicleLabel}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">بدون</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle._id} value={vehicle._id}>{vehicle.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between border rounded-lg p-2">
              <span>مفعّل</span>
              <Switch checked={!!form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
            </div>
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
