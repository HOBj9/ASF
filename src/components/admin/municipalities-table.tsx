"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { apiClient } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import toast from "react-hot-toast"
import { useLabels } from "@/hooks/use-labels"
import { isAdmin } from "@/lib/permissions"
import { Loading } from "@/components/ui/loading"
import dynamic from "next/dynamic"

const MapPicker = dynamic(
  () => import("@/components/ui/map-picker").then((mod) => mod.MapPicker),
  { ssr: false, loading: () => <div className="h-[240px] rounded-lg border animate-pulse bg-muted" /> }
)

type BranchLabels = {
  branchLabel?: string
  pointLabel?: string
  vehicleLabel?: string
  driverLabel?: string
  routeLabel?: string
  lineSupervisorLabel?: string
  surveyLabel?: string
  eventsReportLabel?: string
  latestEventsLabel?: string
}

type Branch = {
  _id: string
  organizationId: string
  name: string
  nameAr?: string
  governorate?: string
  areaName?: string
  addressText?: string
  centerLat: number
  centerLng: number
  timezone: string
  atharKey?: string
  fuelPricePerKmGasoline?: number | null
  fuelPricePerKmDiesel?: number | null
  labels?: BranchLabels
  isActive: boolean
}

type Organization = {
  _id: string
  name: string
  labels?: {
    branchLabel?: string
  }
}

type AdminUserForm = {
  adminUserName: string
  adminUserEmail: string
  adminUserPassword: string
}

type BranchDetailsResponse = {
  branchAdminUser?: {
    _id: string
    name: string
    email: string
  } | null
}

const emptyBranchLabels: BranchLabels = {}

const emptyBranch: Partial<Branch> = {
  organizationId: "",
  name: "",
  nameAr: "",
  governorate: "",
  areaName: "",
  addressText: "",
  centerLat: 0,
  centerLng: 0,
  timezone: "Asia/Damascus",
  atharKey: "",
  fuelPricePerKmGasoline: undefined,
  fuelPricePerKmDiesel: undefined,
  labels: emptyBranchLabels,
  isActive: true,
}

const emptyAdminUser: AdminUserForm = {
  adminUserName: "",
  adminUserEmail: "",
  adminUserPassword: "",
}

export function MunicipalitiesTable() {
  const { data: session } = useSession()
  const [items, setItems] = useState<Branch[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [form, setForm] = useState<Partial<Branch>>(emptyBranch)
  const [adminUser, setAdminUser] = useState<AdminUserForm>(emptyAdminUser)
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>("")
  const { labels } = useLabels()

  const userIsAdmin = useMemo(() => isAdmin(session?.user?.role as any), [session?.user?.role])
  const isSuperAdmin = useMemo(() => {
    const role = session?.user?.role as any
    return role?.name === "super_admin"
  }, [session?.user?.role])

  const branchLabel = useMemo(() => {
    if (!form.organizationId) return labels.branchLabel || "الفرع"
    const org = organizations.find((o) => o._id === form.organizationId)
    return org?.labels?.branchLabel || labels.branchLabel || "الفرع"
  }, [form.organizationId, organizations, labels.branchLabel])

  const loadOrganizations = useCallback(async () => {
    try {
      const orgRes = await apiClient.get("/organizations").catch(() => ({ organizations: [] as Organization[] } as any))
      const orgList = orgRes.organizations || orgRes.data?.organizations || []
      setOrganizations(orgList)
      return orgList
    } catch {
      return []
    }
  }, [])

  const loadBranches = useCallback(async (organizationId?: string | null) => {
    setLoading(true)
    try {
      if (userIsAdmin && !organizationId) {
        setItems([])
        setLoading(false)
        return
      }
      const url = organizationId ? `/branches?organizationId=${organizationId}` : "/branches"
      const branchesRes = await apiClient.get(url)
      const branchList = branchesRes.branches || branchesRes.data?.branches || []
      setItems(branchList)
    } catch (error: any) {
      toast.error(error.message || `فشل تحميل ${labels.branchLabel}`)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [labels.branchLabel, userIsAdmin])

  useEffect(() => {
    if (session === undefined) return
    let cancelled = false
    const run = async () => {
      const orgList = await loadOrganizations()
      if (cancelled) return
      if (userIsAdmin) {
        setItems([])
        if (!selectedOrganizationId && orgList.length === 1) {
          setSelectedOrganizationId(orgList[0]._id)
        }
      } else {
        await loadBranches(null)
      }
    }
    void run()
    return () => { cancelled = true }
  }, [loadBranches, loadOrganizations, selectedOrganizationId, session, userIsAdmin])

  useEffect(() => {
    if (!userIsAdmin) return
    if (selectedOrganizationId) {
      void loadBranches(selectedOrganizationId)
    } else {
      setItems([])
    }
  }, [loadBranches, selectedOrganizationId, userIsAdmin])

  const openCreate = () => {
    const defaultOrgId = userIsAdmin
      ? selectedOrganizationId || (organizations.length === 1 ? organizations[0]._id : "")
      : organizations.length === 1 ? organizations[0]._id : ""
    setEditing(null)
    setForm({ ...emptyBranch, organizationId: defaultOrgId })
    setAdminUser({ ...emptyAdminUser })
    setOpen(true)
  }

  const openEdit = async (item: Branch) => {
    setEditing(item)
    setForm({
      ...item,
      organizationId: item.organizationId,
      atharKey: item.atharKey || "",
      governorate: item.governorate || "",
      areaName: item.areaName || "",
      addressText: item.addressText || "",
      fuelPricePerKmGasoline: item.fuelPricePerKmGasoline ?? undefined,
      fuelPricePerKmDiesel: item.fuelPricePerKmDiesel ?? undefined,
    })
    setAdminUser({ ...emptyAdminUser })
    setOpen(true)

    try {
      const detailsRes = await apiClient.get<BranchDetailsResponse & { branch?: Branch }>(`/branches/${item._id}`)
      const branchFromApi = detailsRes.branch || (detailsRes as any).data?.branch
      if (branchFromApi) {
        setForm((prev) => ({
          ...prev,
          ...branchFromApi,
          labels: branchFromApi.labels && typeof branchFromApi.labels === "object" ? { ...emptyBranchLabels, ...branchFromApi.labels } : emptyBranchLabels,
        }))
      }
      const branchAdminUser = detailsRes.branchAdminUser || (detailsRes as any).data?.branchAdminUser
      setAdminUser({
        adminUserName: branchAdminUser?.name || "",
        adminUserEmail: branchAdminUser?.email || "",
        adminUserPassword: "",
      })
    } catch {
      toast.error("تعذر تحميل بيانات حساب مدير الفرع")
    }
  }

  const submit = async () => {
    if (!form.name || form.centerLat === undefined || form.centerLng === undefined) {
      toast.error("الاسم والإحداثيات مطلوبة")
      return
    }

    if (isSuperAdmin && !form.organizationId) {
      toast.error("يرجى اختيار المؤسسة")
      return
    }

    try {
      if (editing) {
        const payload: Record<string, unknown> = { ...form }
        if (adminUser.adminUserEmail.trim()) payload.adminUserEmail = adminUser.adminUserEmail.trim()
        if (adminUser.adminUserPassword.trim()) payload.adminUserPassword = adminUser.adminUserPassword.trim()

        await apiClient.patch(`/branches/${editing._id}`, payload)
        toast.success(`تم تحديث ${labels.branchLabel}`)
      } else {
        if (!adminUser.adminUserName || !adminUser.adminUserEmail || !adminUser.adminUserPassword) {
          toast.error(`بيانات مستخدم ${labels.branchLabel} مطلوبة`)
          return
        }
        await apiClient.post("/branches", {
          ...form,
          ...adminUser,
        })
        toast.success(`تم إنشاء ${labels.branchLabel}`)
      }
      setOpen(false)
      if (userIsAdmin) await loadBranches(selectedOrganizationId)
      else await loadBranches(null)
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  const remove = async (item: Branch) => {
    if (!confirm(`حذف ${labels.branchLabel} ${item.name}؟`)) return
    try {
      await apiClient.delete(`/branches/${item._id}`)
      setItems((prev) => prev.filter((i) => i._id !== item._id))
      toast.success(`تم حذف ${labels.branchLabel}`)
      if (userIsAdmin) await loadBranches(selectedOrganizationId)
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  return (
    <Card className="text-right">
      <CardHeader>
        <div className="flex items-center justify-between flex-row-reverse">
          <CardTitle>{labels.branchLabel}</CardTitle>
          <Button onClick={openCreate}>إضافة {labels.branchLabel}</Button>
        </div>
      </CardHeader>
      <CardContent>
        {userIsAdmin && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">المؤسسة:</span>
            <Select
              value={selectedOrganizationId || ""}
              onValueChange={(value) => setSelectedOrganizationId(value)}
            >
              <SelectTrigger className="w-[220px] text-right">
                <SelectValue placeholder="يرجى تحديد المؤسسة" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org._id} value={org._id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedOrganizationId && (
              <span className="text-sm text-muted-foreground">يرجى تحديد المؤسسة لتحميل {labels.branchLabel}</span>
            )}
          </div>
        )}
        {loading ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-right">
                  <th className="p-2">الاسم</th>
                  <th className="p-2">المحافظة</th>
                  <th className="p-2">المنطقة</th>
                  <th className="p-2">المنطقة الزمنية</th>
                  <th className="p-2">الحالة</th>
                  <th className="p-2">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className="border-b">
                    <td className="p-2">{item.name}</td>
                    <td className="p-2">{item.governorate || "-"}</td>
                    <td className="p-2">{item.areaName || "-"}</td>
                    <td className="p-2">{item.timezone || "Asia/Damascus"}</td>
                    <td className="p-2">{item.isActive ? "مفعلة" : "معطلة"}</td>
                    <td className="p-2 space-x-2 space-x-reverse">
                      <Button variant="outline" onClick={() => openEdit(item)}>تعديل</Button>
                      <Button variant="destructive" onClick={() => remove(item)}>حذف</Button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-muted-foreground" colSpan={6}>
                      لا توجد {labels.branchLabel} بعد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="text-right max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `تعديل ${branchLabel}` : `إضافة ${branchLabel}`}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            {isSuperAdmin && (
              <div>
                <Label>المؤسسة</Label>
                <Select value={form.organizationId || ""} onValueChange={(value) => setForm({ ...form, organizationId: value })}>
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="اختر المؤسسة" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org._id} value={org._id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>اسم {labels.branchLabel}</Label>
              <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>اسم عربي</Label>
              <Input value={form.nameAr || ""} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
            </div>
            <div>
              <Label>المحافظة</Label>
              <Input value={form.governorate || ""} onChange={(e) => setForm({ ...form, governorate: e.target.value })} />
            </div>
            <div>
              <Label>المنطقة</Label>
              <Input value={form.areaName || ""} onChange={(e) => setForm({ ...form, areaName: e.target.value })} />
            </div>
            <div>
              <Label>العنوان</Label>
              <Input value={form.addressText || ""} onChange={(e) => setForm({ ...form, addressText: e.target.value })} />
            </div>

            <div>
              <Label className="mb-2 block">تحديد الموقع على الخريطة</Label>
              <MapPicker
                lat={form.centerLat ?? 0}
                lng={form.centerLng ?? 0}
                onSelect={(lat, lng) => setForm((f) => ({ ...f, centerLat: lat, centerLng: lng }))}
                height="260px"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>خط العرض</Label>
                <Input type="number" step="any" value={form.centerLat ?? 0} onChange={(e) => setForm({ ...form, centerLat: Number(e.target.value) })} />
              </div>
              <div>
                <Label>خط الطول</Label>
                <Input type="number" step="any" value={form.centerLng ?? 0} onChange={(e) => setForm({ ...form, centerLng: Number(e.target.value) })} />
              </div>
            </div>

            <div>
              <Label>المنطقة الزمنية</Label>
              <Input value={form.timezone || "Asia/Damascus"} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
            </div>

            <div>
              <Label>Athar Key</Label>
              <Input value={form.atharKey || ""} onChange={(e) => setForm({ ...form, atharKey: e.target.value })} />
            </div>

            <div className="pt-2 border-t">
              <div className="text-sm text-muted-foreground mb-2">أسعار الوقود (سعر الكيلو متر - للأمثال)</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>سعر الكيلو متر - بنزين</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="اختياري"
                  value={form.fuelPricePerKmGasoline ?? ""}
                  onChange={(e) => setForm({ ...form, fuelPricePerKmGasoline: e.target.value === "" ? undefined : Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>سعر الكيلو متر - مازوت</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="اختياري"
                  value={form.fuelPricePerKmDiesel ?? ""}
                  onChange={(e) => setForm({ ...form, fuelPricePerKmDiesel: e.target.value === "" ? undefined : Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="text-sm text-muted-foreground mb-2">تسميات الفرع (اختياري)</div>
            </div>
            <div>
              <Label>تسمية الفرع</Label>
              <Input value={form.labels?.branchLabel ?? ""} onChange={(e) => setForm({ ...form, labels: { ...form.labels, branchLabel: e.target.value || undefined } })} placeholder="تركه فارغاً لاستخدام تسمية المؤسسة" />
            </div>
            <div>
              <Label>تسمية النقاط</Label>
              <Input value={form.labels?.pointLabel ?? ""} onChange={(e) => setForm({ ...form, labels: { ...form.labels, pointLabel: e.target.value || undefined } })} placeholder="تركه فارغاً لاستخدام تسمية المؤسسة" />
            </div>
            <div>
              <Label>تسمية المركبات</Label>
              <Input value={form.labels?.vehicleLabel ?? ""} onChange={(e) => setForm({ ...form, labels: { ...form.labels, vehicleLabel: e.target.value || undefined } })} placeholder="تركه فارغاً لاستخدام تسمية المؤسسة" />
            </div>
            <div>
              <Label>تسمية السائقين</Label>
              <Input value={form.labels?.driverLabel ?? ""} onChange={(e) => setForm({ ...form, labels: { ...form.labels, driverLabel: e.target.value || undefined } })} placeholder="تركه فارغاً لاستخدام تسمية المؤسسة" />
            </div>
            <div>
              <Label>تسمية المسارات</Label>
              <Input value={form.labels?.routeLabel ?? ""} onChange={(e) => setForm({ ...form, labels: { ...form.labels, routeLabel: e.target.value || undefined } })} placeholder="تركه فارغاً لاستخدام تسمية المؤسسة" />
            </div>
            <div>
              <Label>تسمية مشرفي الخط</Label>
              <Input value={form.labels?.lineSupervisorLabel ?? ""} onChange={(e) => setForm({ ...form, labels: { ...form.labels, lineSupervisorLabel: e.target.value || undefined } })} placeholder="تركه فارغاً لاستخدام تسمية المؤسسة" />
            </div>
            <div>
              <Label>تسمية الاستبيانات</Label>
              <Input value={form.labels?.surveyLabel ?? ""} onChange={(e) => setForm({ ...form, labels: { ...form.labels, surveyLabel: e.target.value || undefined } })} placeholder="تركه فارغاً لاستخدام تسمية المؤسسة" />
            </div>
            <div>
              <Label>تسمية تقارير الأحداث</Label>
              <Input value={form.labels?.eventsReportLabel ?? ""} onChange={(e) => setForm({ ...form, labels: { ...form.labels, eventsReportLabel: e.target.value || undefined } })} placeholder="تركه فارغاً لاستخدام تسمية المؤسسة" />
            </div>
            <div>
              <Label>تسمية قسم آخر الأحداث</Label>
              <Input value={form.labels?.latestEventsLabel ?? ""} onChange={(e) => setForm({ ...form, labels: { ...form.labels, latestEventsLabel: e.target.value || undefined } })} placeholder="تركه فارغاً لاستخدام تسمية المؤسسة" />
            </div>

            {!editing && (
              <>
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground mb-2">بيانات مستخدم {labels.branchLabel}</div>
                </div>
                <div>
                  <Label>اسم المستخدم</Label>
                  <Input value={adminUser.adminUserName} onChange={(e) => setAdminUser({ ...adminUser, adminUserName: e.target.value })} />
                </div>
                <div>
                  <Label>البريد الإلكتروني</Label>
                  <Input type="email" value={adminUser.adminUserEmail} onChange={(e) => setAdminUser({ ...adminUser, adminUserEmail: e.target.value })} />
                </div>
                <div>
                  <Label>كلمة المرور</Label>
                  <Input type="password" value={adminUser.adminUserPassword} onChange={(e) => setAdminUser({ ...adminUser, adminUserPassword: e.target.value })} />
                </div>
              </>
            )}
            {editing && (
              <>
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground mb-2">بيانات حساب مدير {labels.branchLabel}</div>
                </div>
                <div>
                  <Label>البريد الإلكتروني</Label>
                  <Input
                    type="email"
                    value={adminUser.adminUserEmail}
                    onChange={(e) => setAdminUser({ ...adminUser, adminUserEmail: e.target.value })}
                  />
                </div>
                <div>
                  <Label>كلمة المرور الجديدة (اختياري)</Label>
                  <Input
                    type="password"
                    value={adminUser.adminUserPassword}
                    onChange={(e) => setAdminUser({ ...adminUser, adminUserPassword: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-between border rounded-lg p-2">
              <span>مفعلة</span>
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
