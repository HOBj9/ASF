"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api/client"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, Loader2 } from "lucide-react"
import type { ISurveyQuestion } from "@/models/Survey"

const QUESTION_TYPES = [
  { value: "text", label: "نص حر" },
  { value: "choice", label: "اختيار من متعدد" },
  { value: "current_location", label: "الموقع الحالي (على الخريطة)" },
] as const

type Survey = {
  _id: string
  organizationId: string
  title: string
  titleAr?: string
  description?: string
  questions: ISurveyQuestion[]
  isActive: boolean
}

type Organization = { _id: string; name: string }

const emptyQuestion: ISurveyQuestion = {
  type: "text",
  questionText: "",
  required: false,
}

export function SurveyBuilder({ surveyId }: { surveyId?: string }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [organizationId, setOrganizationId] = useState("")
  const [title, setTitle] = useState("")
  const [titleAr, setTitleAr] = useState("")
  const [description, setDescription] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [questions, setQuestions] = useState<ISurveyQuestion[]>([{ ...emptyQuestion }])
  const [loading, setLoading] = useState(!!surveyId)
  const [saving, setSaving] = useState(false)

  const userIsAdmin = session?.user && (session.user as any).role?.name === "super_admin"
  const sessionOrgId = (session?.user as any)?.organizationId?.toString?.() || ""

  const resolvedOrgId = organizationId || sessionOrgId

  const loadOrganizations = useCallback(async () => {
    try {
      const res: any = await apiClient.get("/organizations").catch(() => ({ organizations: [] }))
      const list = res.organizations || res.data?.organizations || []
      setOrganizations(list)
      if (list.length === 1) setOrganizationId(list[0]._id)
      return list
    } catch {
      return []
    }
  }, [])

  const loadSurvey = useCallback(async () => {
    if (!surveyId) return
    setLoading(true)
    try {
      const res: any = await apiClient.get(`surveys/${surveyId}`)
      const s: Survey = res.survey || res.data?.survey
      if (!s) {
        toast.error("الاستبيان غير موجود")
        router.push("/dashboard/surveys")
        return
      }
      setTitle(s.title)
      setTitleAr(s.titleAr || "")
      setDescription(s.description || "")
      setIsActive(s.isActive !== false)
      setQuestions(
        s.questions?.length
          ? s.questions.map((q) => ({
              type: (q.type as any) || "text",
              questionText: q.questionText || "",
              questionTextAr: q.questionTextAr,
              options: q.options ? [...q.options] : undefined,
              required: q.required ?? false,
            }))
          : [{ ...emptyQuestion }]
      )
      setOrganizationId((s as any).organizationId?.toString?.() || "")
    } catch (e: any) {
      toast.error(e?.message || "فشل تحميل الاستبيان")
      router.push("/dashboard/surveys")
    } finally {
      setLoading(false)
    }
  }, [surveyId, router])

  useEffect(() => {
    if (userIsAdmin) loadOrganizations()
  }, [userIsAdmin, loadOrganizations])

  useEffect(() => {
    if (surveyId) loadSurvey()
  }, [surveyId, loadSurvey])

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { ...emptyQuestion }])
  }

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  const updateQuestion = (index: number, field: keyof ISurveyQuestion, value: any) => {
    setQuestions((prev) => {
      const next = [...prev]
      const q = { ...next[index], [field]: value }
      next[index] = q
      return next
    })
  }

  const addOption = (qIndex: number) => {
    setQuestions((prev) => {
      const next = [...prev]
      const q = next[qIndex]
      const options = q.options ? [...q.options, ""] : [""]
      next[qIndex] = { ...q, options }
      return next
    })
  }

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    setQuestions((prev) => {
      const next = [...prev]
      const q = next[qIndex]
      const options = [...(q.options || [])]
      options[optIndex] = value
      next[qIndex] = { ...q, options }
      return next
    })
  }

  const removeOption = (qIndex: number, optIndex: number) => {
    setQuestions((prev) => {
      const next = [...prev]
      const q = next[qIndex]
      const options = (q.options || []).filter((_, i) => i !== optIndex)
      next[qIndex] = { ...q, options: options.length ? options : undefined }
      return next
    })
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("عنوان الاستبيان مطلوب")
      return
    }
    if (!resolvedOrgId) {
      toast.error("حدد المؤسسة")
      return
    }

    const qs = questions
      .filter((q) => q.questionText?.trim())
      .map((q) => ({
        type: q.type,
        questionText: q.questionText.trim(),
        questionTextAr: q.questionTextAr?.trim(),
        options: q.options?.filter(Boolean),
        required: q.required ?? false,
      }))

    setSaving(true)
    try {
      if (surveyId) {
        await apiClient.patch(`organizations/${resolvedOrgId}/surveys/${surveyId}`, {
          title: title.trim(),
          titleAr: titleAr.trim() || undefined,
          description: description.trim() || undefined,
          questions: qs,
          isActive,
        })
        toast.success("تم حفظ التعديلات")
      } else {
        await apiClient.post(`organizations/${resolvedOrgId}/surveys`, {
          title: title.trim(),
          titleAr: titleAr.trim() || undefined,
          description: description.trim() || undefined,
          questions: qs,
          isActive,
        })
        toast.success("تم إنشاء الاستبيان")
      }
      router.push("/dashboard/surveys")
    } catch (e: any) {
      toast.error(e?.message || "فشل الحفظ")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>البيانات الأساسية</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {userIsAdmin && organizations.length > 1 && (
          <div className="space-y-2">
            <Label>المؤسسة</Label>
            <Select value={organizationId} onValueChange={setOrganizationId}>
              <SelectTrigger>
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
          </div>
        )}

        <div className="space-y-2">
          <Label>العنوان</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الاستبيان" className="text-right" />
        </div>
        <div className="space-y-2">
          <Label>العنوان (عربي)</Label>
          <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} placeholder="عنوان الاستبيان بالعربية" className="text-right" />
        </div>
        <div className="space-y-2">
          <Label>الوصف (اختياري)</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف قصير" className="text-right" />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <Label>استبيان نشط (يمكن لمشرفي الخط الإجابة)</Label>
        </div>
      </CardContent>

      <CardHeader>
        <CardTitle>الأسئلة</CardTitle>
        <p className="text-sm text-muted-foreground">أضف أسئلة من نوع نص، اختيار، أو الموقع الحالي</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((q, index) => (
          <Card key={index}>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">سؤال {index + 1}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>نوع السؤال</Label>
                  <Select
                    value={q.type}
                    onValueChange={(v) => updateQuestion(index, "type", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={q.required ?? false}
                    onCheckedChange={(v) => updateQuestion(index, "required", v)}
                  />
                  <Label>مطلوب</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>نص السؤال</Label>
                <Input
                  value={q.questionText}
                  onChange={(e) => updateQuestion(index, "questionText", e.target.value)}
                  placeholder="نص السؤال"
                  className="text-right"
                />
              </div>
              {q.type === "choice" && (
                <div className="space-y-2">
                  <Label>الخيارات</Label>
                  {(q.options || []).map((opt, oi) => (
                    <div key={oi} className="flex gap-2">
                      <Input
                        value={opt}
                        onChange={(e) => updateOption(index, oi, e.target.value)}
                        placeholder={`خيار ${oi + 1}`}
                        className="text-right"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => removeOption(index, oi)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => addOption(index)}>
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة خيار
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        <Button type="button" variant="outline" onClick={addQuestion}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة سؤال
        </Button>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
          {surveyId ? "حفظ التعديلات" : "إنشاء الاستبيان"}
        </Button>
      </CardContent>
    </Card>
  )
}
