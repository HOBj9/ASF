"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { apiClient } from "@/lib/api/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import toast from "react-hot-toast"
import { Loading } from "@/components/ui/loading"
import { Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react"

type Primary = { _id: string; name: string; nameAr?: string | null; order: number }
type Secondary = { _id: string; primaryClassificationId: string; name: string; nameAr?: string | null; order: number }

export function PointClassificationsManager() {
  const { data: session } = useSession()
  const [organizationId, setOrganizationId] = useState<string>("")
  const [primaries, setPrimaries] = useState<Primary[]>([])
  const [secondaries, setSecondaries] = useState<Secondary[]>([])
  const [loading, setLoading] = useState(true)
  const [available, setAvailable] = useState(false)

  const [primaryDialogOpen, setPrimaryDialogOpen] = useState(false)
  const [secondaryDialogOpen, setSecondaryDialogOpen] = useState(false)
  const [editingPrimary, setEditingPrimary] = useState<Primary | null>(null)
  const [editingSecondary, setEditingSecondary] = useState<Secondary | null>(null)
  const [primaryForm, setPrimaryForm] = useState({ name: "", nameAr: "" })
  const [secondaryForm, setSecondaryForm] = useState({ name: "", nameAr: "", primaryId: "" })
  const [saving, setSaving] = useState(false)
  const [expandedPrimaries, setExpandedPrimaries] = useState<Set<string>>(new Set())

  const loadClassifications = useCallback(async () => {
    const orgId = (session?.user as any)?.organizationId
    if (!orgId) {
      setAvailable(false)
      setLoading(false)
      return
    }
    setOrganizationId(orgId)
    setLoading(true)
    try {
      const res: any = await apiClient.get(`organizations/${orgId}/point-classifications`)
      setPrimaries(res.primaries || [])
      setSecondaries(res.secondaries || [])
      setAvailable(true)
    } catch (e: any) {
      setAvailable(false)
      if (e?.status !== 403) toast.error(e?.message || "فشل تحميل التصنيفات")
    } finally {
      setLoading(false)
    }
  }, [session?.user])

  useEffect(() => {
    if (session !== undefined) loadClassifications()
  }, [session, loadClassifications])

  const openAddPrimary = () => {
    setEditingPrimary(null)
    setPrimaryForm({ name: "", nameAr: "" })
    setPrimaryDialogOpen(true)
  }

  const openEditPrimary = (p: Primary) => {
    setEditingPrimary(p)
    setPrimaryForm({ name: p.name, nameAr: p.nameAr || "" })
    setPrimaryDialogOpen(true)
  }

  const savePrimary = async () => {
    if (!primaryForm.name.trim()) {
      toast.error("الاسم مطلوب")
      return
    }
    setSaving(true)
    try {
      if (editingPrimary) {
        await apiClient.patch(
          `organizations/${organizationId}/point-classifications/primary/${editingPrimary._id}`,
          { name: primaryForm.name.trim(), nameAr: primaryForm.nameAr.trim() || null }
        )
        toast.success("تم تحديث التصنيف الأساسي")
      } else {
        await apiClient.post(`organizations/${organizationId}/point-classifications/primary`, {
          name: primaryForm.name.trim(),
          nameAr: primaryForm.nameAr.trim() || null,
        })
        toast.success("تم إضافة التصنيف الأساسي")
      }
      setPrimaryDialogOpen(false)
      await loadClassifications()
    } catch (e: any) {
      toast.error(e?.message || "فشل الحفظ")
    } finally {
      setSaving(false)
    }
  }

  const deletePrimary = async (p: Primary) => {
    if (!confirm(`حذف التصنيف الأساسي "${p.nameAr || p.name}"؟ سيتم حذف جميع التصنيفات الفرعية المرتبطة.`)) return
    setSaving(true)
    try {
      await apiClient.delete(
        `organizations/${organizationId}/point-classifications/primary/${p._id}`
      )
      toast.success("تم الحذف")
      await loadClassifications()
    } catch (e: any) {
      toast.error(e?.message || "فشل الحذف")
    } finally {
      setSaving(false)
    }
  }

  const openAddSecondary = (primaryId: string) => {
    setEditingSecondary(null)
    setSecondaryForm({ name: "", nameAr: "", primaryId })
    setSecondaryDialogOpen(true)
  }

  const openEditSecondary = (s: Secondary) => {
    setEditingSecondary(s)
    setSecondaryForm({ name: s.name, nameAr: s.nameAr || "", primaryId: s.primaryClassificationId })
    setSecondaryDialogOpen(true)
  }

  const saveSecondary = async () => {
    if (!secondaryForm.name.trim()) {
      toast.error("الاسم مطلوب")
      return
    }
    if (!secondaryForm.primaryId) {
      toast.error("التصنيف الأساسي مطلوب")
      return
    }
    setSaving(true)
    try {
      if (editingSecondary) {
        await apiClient.patch(
          `organizations/${organizationId}/point-classifications/secondary/${editingSecondary._id}`,
          { name: secondaryForm.name.trim(), nameAr: secondaryForm.nameAr.trim() || null }
        )
        toast.success("تم تحديث التصنيف الفرعي")
      } else {
        await apiClient.post(`organizations/${organizationId}/point-classifications/secondary`, {
          name: secondaryForm.name.trim(),
          nameAr: secondaryForm.nameAr.trim() || null,
          primaryClassificationId: secondaryForm.primaryId,
        })
        toast.success("تم إضافة التصنيف الفرعي")
      }
      setSecondaryDialogOpen(false)
      await loadClassifications()
    } catch (e: any) {
      toast.error(e?.message || "فشل الحفظ")
    } finally {
      setSaving(false)
    }
  }

  const deleteSecondary = async (s: Secondary) => {
    if (!confirm(`حذف التصنيف الفرعي "${s.nameAr || s.name}"؟`)) return
    setSaving(true)
    try {
      await apiClient.delete(
        `organizations/${organizationId}/point-classifications/secondary/${s._id}`
      )
      toast.success("تم الحذف")
      await loadClassifications()
    } catch (e: any) {
      toast.error(e?.message || "فشل الحذف")
    } finally {
      setSaving(false)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedPrimaries((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getSecondariesForPrimary = (primaryId: string) =>
    secondaries.filter((s) => String(s.primaryClassificationId) === String(primaryId))

  if (!available && !loading) {
    return (
      <Card className="text-right">
        <CardHeader>
          <CardTitle>تصنيفات النقاط</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            لا تملك صلاحية إدارة تصنيفات النقاط أو لا توجد مؤسسة مرتبطة بهذا الحساب.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="text-right">
      <CardHeader>
        <div className="flex items-center justify-between flex-row-reverse">
          <CardTitle>تصنيفات النقاط</CardTitle>
          <Button size="sm" onClick={openAddPrimary} disabled={loading}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة تصنيف أساسي
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          التصنيفات الأساسية والفرعية للنقاط. تُستخدم عند إضافة نقطة أو الإجابة على الاستبيان.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loading text="جاري تحميل التصنيفات..." />
        ) : primaries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            لا توجد تصنيفات. أضف تصنيفاً أساسياً أولاً.
          </p>
        ) : (
          <div className="space-y-2">
            {primaries.map((p) => {
              const subs = getSecondariesForPrimary(p._id)
              const isExpanded = expandedPrimaries.has(p._id)
              return (
                <div key={p._id} className="border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between p-3 hover:bg-muted/30 cursor-pointer"
                    onClick={() => toggleExpand(p._id)}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      <span className="font-medium">{p.nameAr || p.name}</span>
                      <span className="text-xs text-muted-foreground">({subs.length} فرعي)</span>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openAddSecondary(p._id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditPrimary(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deletePrimary(p)}
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t bg-muted/20 p-2 space-y-1">
                      {subs.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2 px-3">لا توجد تصنيفات فرعية</p>
                      ) : (
                        subs.map((s) => (
                          <div
                            key={s._id}
                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30"
                          >
                            <span className="text-sm">{s.nameAr || s.name}</span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEditSecondary(s)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => deleteSecondary(s)}
                                disabled={saving}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={primaryDialogOpen} onOpenChange={setPrimaryDialogOpen}>
        <DialogContent className="text-right">
          <DialogHeader>
            <DialogTitle>
              {editingPrimary ? "تعديل تصنيف أساسي" : "إضافة تصنيف أساسي"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>الاسم</Label>
              <Input
                value={primaryForm.name}
                onChange={(e) => setPrimaryForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="مثال: حاوية نفايات"
              />
            </div>
            <div>
              <Label>الاسم بالعربية</Label>
              <Input
                value={primaryForm.nameAr}
                onChange={(e) => setPrimaryForm((f) => ({ ...f, nameAr: e.target.value }))}
                placeholder="اختياري"
              />
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setPrimaryDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={savePrimary} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              {editingPrimary ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={secondaryDialogOpen} onOpenChange={setSecondaryDialogOpen}>
        <DialogContent className="text-right">
          <DialogHeader>
            <DialogTitle>
              {editingSecondary ? "تعديل تصنيف فرعي" : "إضافة تصنيف فرعي"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!editingSecondary && (
              <div>
                <Label>التصنيف الأساسي</Label>
                <Input
                  value={
                    primaries.find((x) => String(x._id) === secondaryForm.primaryId)?.nameAr ||
                    primaries.find((x) => String(x._id) === secondaryForm.primaryId)?.name ||
                    ""
                  }
                  disabled
                  className="bg-muted"
                />
              </div>
            )}
            <div>
              <Label>الاسم</Label>
              <Input
                value={secondaryForm.name}
                onChange={(e) => setSecondaryForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="مثال: عادية"
              />
            </div>
            <div>
              <Label>الاسم بالعربية</Label>
              <Input
                value={secondaryForm.nameAr}
                onChange={(e) => setSecondaryForm((f) => ({ ...f, nameAr: e.target.value }))}
                placeholder="اختياري"
              />
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setSecondaryDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={saveSecondary} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              {editingSecondary ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
