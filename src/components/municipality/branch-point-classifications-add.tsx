"use client"

import { useCallback, useEffect, useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import toast from "react-hot-toast"
import { Plus, Loader2, ChevronDown, ChevronUp } from "lucide-react"

type Primary = { _id: string; name: string; nameAr?: string | null; branchId?: string | null }
type Secondary = { _id: string; primaryClassificationId: string; name: string; nameAr?: string | null; branchId?: string | null }

interface BranchPointClassificationsAddProps {
  branchId: string | null
  /** When true, user is branch admin (add-only). When false, hide. */
  canAdd: boolean
}

export function BranchPointClassificationsAdd({ branchId, canAdd }: BranchPointClassificationsAddProps) {
  const [primaries, setPrimaries] = useState<Primary[]>([])
  const [secondaries, setSecondaries] = useState<Secondary[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const [addPrimaryOpen, setAddPrimaryOpen] = useState(false)
  const [addSecondaryOpen, setAddSecondaryOpen] = useState(false)
  const [primaryForm, setPrimaryForm] = useState({ name: "", nameAr: "" })
  const [secondaryForm, setSecondaryForm] = useState({ name: "", nameAr: "", primaryId: "" })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!branchId) return
    setLoading(true)
    try {
      const res: any = await apiClient.get(`points/classifications?branchId=${branchId}`)
      setPrimaries(res.primaries || [])
      setSecondaries(res.secondaries || [])
    } catch (e: any) {
      toast.error(e?.message || "فشل تحميل التصنيفات")
    } finally {
      setLoading(false)
    }
  }, [branchId])

  useEffect(() => {
    if (branchId && canAdd) load()
  }, [branchId, canAdd, load])

  const savePrimary = async () => {
    if (!primaryForm.name.trim() || !branchId) return
    setSaving(true)
    try {
      await apiClient.post("points/classifications", {
        type: "primary",
        branchId,
        name: primaryForm.name.trim(),
        nameAr: primaryForm.nameAr.trim() || null,
      })
      toast.success("تم إضافة التصنيف الأساسي")
      setAddPrimaryOpen(false)
      setPrimaryForm({ name: "", nameAr: "" })
      await load()
    } catch (e: any) {
      toast.error(e?.message || "فشل الإضافة")
    } finally {
      setSaving(false)
    }
  }

  const saveSecondary = async () => {
    if (!secondaryForm.name.trim() || !secondaryForm.primaryId || !branchId) return
    setSaving(true)
    try {
      await apiClient.post("points/classifications", {
        type: "secondary",
        branchId,
        primaryClassificationId: secondaryForm.primaryId,
        name: secondaryForm.name.trim(),
        nameAr: secondaryForm.nameAr.trim() || null,
      })
      toast.success("تم إضافة التصنيف الفرعي")
      setAddSecondaryOpen(false)
      setSecondaryForm({ name: "", nameAr: "", primaryId: "" })
      await load()
    } catch (e: any) {
      toast.error(e?.message || "فشل الإضافة")
    } finally {
      setSaving(false)
    }
  }

  const getSecondariesForPrimary = (primaryId: string) =>
    secondaries.filter((s) => String(s.primaryClassificationId) === String(primaryId))

  if (!canAdd || !branchId) return null

  return (
    <Card className="text-right">
      <CardHeader
        className="cursor-pointer hover:bg-muted/30 rounded-lg transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            تصنيفات النقاط (إضافة فقط)
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            يمكنك إضافة تصنيفات جديدة. التعديل والحذف من إعدادات المؤسسة.
          </span>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          {loading ? (
            <p className="text-sm text-muted-foreground py-4">جاري التحميل...</p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setAddPrimaryOpen(true)}>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة تصنيف أساسي
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddSecondaryOpen(true)}
                  disabled={primaries.length === 0}
                >
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة تصنيف فرعي
                </Button>
              </div>
              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {primaries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا توجد تصنيفات</p>
                ) : (
                  primaries.map((p) => (
                    <div key={p._id} className="text-sm">
                      <span className="font-medium">{p.nameAr || p.name}</span>
                      {p.branchId && (
                        <span className="text-xs text-muted-foreground mr-2">(من الفرع)</span>
                      )}
                      <div className="mr-4 mt-1 space-y-0.5">
                        {getSecondariesForPrimary(p._id).map((s) => (
                          <div key={s._id} className="text-muted-foreground">
                            — {s.nameAr || s.name}
                            {s.branchId && (
                              <span className="text-xs mr-1">(من الفرع)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}

      <Dialog open={addPrimaryOpen} onOpenChange={setAddPrimaryOpen}>
        <DialogContent className="text-right">
          <DialogHeader>
            <DialogTitle>إضافة تصنيف أساسي</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>الاسم</Label>
              <Input
                value={primaryForm.name}
                onChange={(e) => setPrimaryForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="مثال: حاوية طبية"
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
            <Button variant="outline" onClick={() => setAddPrimaryOpen(false)}>إلغاء</Button>
            <Button onClick={savePrimary} disabled={saving || !primaryForm.name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addSecondaryOpen} onOpenChange={setAddSecondaryOpen}>
        <DialogContent className="text-right">
          <DialogHeader>
            <DialogTitle>إضافة تصنيف فرعي</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>التصنيف الأساسي</Label>
              <Select
                value={secondaryForm.primaryId}
                onValueChange={(v) => setSecondaryForm((f) => ({ ...f, primaryId: v }))}
              >
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="اختر التصنيف الأساسي" />
                </SelectTrigger>
                <SelectContent>
                  {primaries.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.nameAr || p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الاسم</Label>
              <Input
                value={secondaryForm.name}
                onChange={(e) => setSecondaryForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="مثال: حاوية طبية صغيرة"
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
            <Button variant="outline" onClick={() => setAddSecondaryOpen(false)}>إلغاء</Button>
            <Button
              onClick={saveSecondary}
              disabled={saving || !secondaryForm.name.trim() || !secondaryForm.primaryId}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
