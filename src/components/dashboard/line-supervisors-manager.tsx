"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useLabels } from "@/hooks/use-labels"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ActionButton } from "@/components/ui/action-button"
import { apiClient } from "@/lib/api/client"
import toast from "react-hot-toast"

type LineSupervisorUser = {
  _id: string
  name: string
  email: string
  role?: { name: string; nameAr?: string }
  isActive?: boolean
  createdAt?: string
}

interface LineSupervisorsManagerProps {
  organizationId: string
  initialUsers: LineSupervisorUser[]
}

export function LineSupervisorsManager({ organizationId, initialUsers }: LineSupervisorsManagerProps) {
  const router = useRouter()
  const { labels } = useLabels()
  const [users, setUsers] = useState<LineSupervisorUser[]>(initialUsers)
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    isActive: true,
  })

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast.error("الاسم والبريد الإلكتروني وكلمة المرور مطلوبة")
      return
    }
    if (form.password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل")
      return
    }
    setSubmitting(true)
    try {
      const res = await apiClient.post(`/organizations/${organizationId}/line-supervisors`, {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        isActive: form.isActive,
      })
      const newUser = res?.data?.user || res?.user
      if (newUser) {
        setUsers((prev) => [newUser, ...prev])
        toast.success(`تم إضافة ${labels.lineSupervisorLabel} بنجاح`)
        setForm({ name: "", email: "", password: "", isActive: true })
        setFormOpen(false)
      } else {
        throw new Error(res?.error || "حدث خطأ")
      }
    } catch (err: any) {
      toast.error(err?.message || `فشل في إضافة ${labels.lineSupervisorLabel}`)
    } finally {
      setSubmitting(false)
    }
  }, [organizationId, form, labels.lineSupervisorLabel])

  return (
    <>
      <Card className="text-right">
        <CardHeader>
          <div className="flex items-center justify-between flex-row-reverse">
            <CardTitle className="text-right">قائمة {labels.lineSupervisorLabel} ({users.length})</CardTitle>
            <ActionButton
              action="create"
              onClick={() => setFormOpen(true)}
              customLabel={`إضافة ${labels.lineSupervisorLabel}`}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-3 font-medium">الاسم</th>
                  <th className="p-3 font-medium">البريد الإلكتروني</th>
                  <th className="p-3 font-medium text-center">الحالة</th>
                  <th className="p-3 font-medium">تاريخ الإضافة</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                      لا يوجد {labels.lineSupervisorLabel} بعد. اضغط &quot;إضافة {labels.lineSupervisorLabel}&quot; لبدء الإضافة.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u._id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">{u.name}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                            u.isActive !== false
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                              : "bg-destructive/20 text-destructive"
                          }`}
                        >
                          {u.isActive !== false ? "نشط" : "غير نشط"}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString("ar-SY", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[500px] text-right">
          <DialogHeader>
            <DialogTitle>إضافة {labels.lineSupervisorLabel}</DialogTitle>
            <DialogDescription>أدخل بيانات {labels.lineSupervisorLabel} الجديد. سيكون مرتبطاً بمؤسستك فقط.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ls-name">الاسم</Label>
              <Input
                id="ls-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="اسم مشرف الخط"
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ls-email">البريد الإلكتروني</Label>
              <Input
                id="ls-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="email@example.com"
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ls-password">كلمة المرور</Label>
              <Input
                id="ls-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="6 أحرف على الأقل"
                disabled={submitting}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="ls-active" className="text-right">الحساب نشط</Label>
              <Checkbox
                id="ls-active"
                checked={form.isActive}
                onCheckedChange={(c) => setForm((p) => ({ ...p, isActive: !!c }))}
                disabled={submitting}
              />
            </div>
            <DialogFooter className="flex-row-reverse gap-2">
              <ActionButton type="button" action="cancel" onClick={() => setFormOpen(false)} disabled={submitting} />
              <ActionButton type="submit" action="save" loading={submitting} disabled={submitting} customLabel="إضافة" />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
