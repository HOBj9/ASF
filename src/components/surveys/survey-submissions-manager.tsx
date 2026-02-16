"use client"

import { useCallback, useEffect, useState } from "react"
import { apiClient } from "@/lib/api/client"
import { useLabels } from "@/hooks/use-labels"
import toast from "react-hot-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MapPin, Loader2 } from "lucide-react"

type Submission = {
  _id: string
  surveyId: { _id: string; title?: string; titleAr?: string } | string
  userId: { _id: string; name?: string; email?: string } | string
  mapLat: number
  mapLng: number
  answers: Record<string, unknown>
  pointId: string | null
  createdAt: string
}

type Survey = { _id: string; title: string; titleAr?: string }

interface SurveySubmissionsManagerProps {
  organizationId: string
  initialSurveyId?: string | null
  /** عند true (مشرف الخط) يظهر ردود المستخدم فقط ولا يظهر زر تحويل إلى نقطة */
  onlyMine?: boolean
}

function answersSummary(answers: Record<string, unknown>): string {
  if (!answers || typeof answers !== "object") return "—"
  const parts = Object.entries(answers)
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`)
  return parts.length ? parts.join(" | ") : "—"
}

export function SurveySubmissionsManager({
  organizationId,
  initialSurveyId,
  onlyMine = false,
}: SurveySubmissionsManagerProps) {
  const { labels } = useLabels()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [surveyIdFilter, setSurveyIdFilter] = useState<string>(initialSurveyId ?? "all")
  // Sync from URL when initialSurveyId changes (e.g. client navigation with query)
  useEffect(() => {
    if (initialSurveyId) setSurveyIdFilter(initialSurveyId)
  }, [initialSurveyId])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(false)
  const [convertingId, setConvertingId] = useState<string | null>(null)

  const loadSurveys = useCallback(async () => {
    if (!organizationId) return
    try {
      const res: any = await apiClient.get(`organizations/${organizationId}/surveys`)
      setSurveys(res.surveys || res.data?.surveys || [])
    } catch {
      setSurveys([])
    }
  }, [organizationId])

  const loadSubmissions = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    try {
      const url =
        surveyIdFilter && surveyIdFilter !== "all"
          ? `organizations/${organizationId}/survey-submissions?surveyId=${surveyIdFilter}`
          : `organizations/${organizationId}/survey-submissions`
      const res: any = await apiClient.get(url)
      setSubmissions(res.submissions || res.data?.submissions || [])
    } catch (e: any) {
      toast.error(e?.message || `فشل تحميل ردود ${labels.surveyLabel}`)
      setSubmissions([])
    } finally {
      setLoading(false)
    }
  }, [organizationId, surveyIdFilter, labels.surveyLabel])

  useEffect(() => {
    loadSurveys()
  }, [loadSurveys])

  useEffect(() => {
    loadSubmissions()
  }, [loadSubmissions])

  const handleConvertToPoint = async (submissionId: string) => {
    setConvertingId(submissionId)
    try {
      await apiClient.post(
        `organizations/${organizationId}/survey-submissions/${submissionId}/convert-to-point`
      )
      toast.success("تم تحويل الرد إلى نقطة بنجاح")
      await loadSubmissions()
    } catch (e: any) {
      toast.error(e?.message || "فشل تحويل الرد إلى نقطة")
    } finally {
      setConvertingId(null)
    }
  }

  const surveyTitle = (s: Submission) => {
    const survey = s.surveyId
    if (!survey) return "—"
    if (typeof survey === "object" && survey !== null) {
      return (survey as any).titleAr || (survey as any).title || "—"
    }
    const found = surveys.find((v) => v._id === survey)
    return found ? found.titleAr || found.title : String(survey)
  }

  const respondentName = (s: Submission) => {
    const u = s.userId
    if (!u) return "—"
    if (typeof u === "object" && u !== null) {
      const name = (u as any).name || (u as any).email
      return name || "—"
    }
    return "—"
  }

  return (
    <Card className="text-right">
      <CardHeader>
        <div className="flex flex-row-reverse items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-right">قائمة الردود ({submissions.length})</CardTitle>
          <Select
            value={surveyIdFilter}
            onValueChange={(v) => setSurveyIdFilter(v)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder={`جميع ${labels.surveyLabel}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع {labels.surveyLabel}</SelectItem>
              {surveys.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.titleAr || s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            جاري التحميل...
          </div>
        ) : (
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm text-right min-w-[640px]">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-3 font-medium">{labels.surveyLabel}</th>
                  {!onlyMine && <th className="p-3 font-medium">المُجيب</th>}
                  <th className="p-3 font-medium">التاريخ</th>
                  <th className="p-3 font-medium">الموقع</th>
                  <th className="p-3 font-medium max-w-[200px]">ملخص الإجابات</th>
                  {!onlyMine && <th className="p-3 font-medium text-center">تحويل إلى نقطة</th>}
                </tr>
              </thead>
              <tbody>
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={onlyMine ? 4 : 6} className="p-6 text-center text-muted-foreground">
                      {onlyMine
                        ? "لا توجد ردود منك بعد. يمكنك الإجابة على الاستبيانات من صفحة " + labels.surveyLabel + "."
                        : `لا توجد ردود. يمكنك عرض الإرسالات بعد إجابة المستخدمين على ${labels.surveyLabel}.`}
                    </td>
                  </tr>
                ) : (
                  submissions.map((s) => (
                    <tr key={s._id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">{surveyTitle(s)}</td>
                      {!onlyMine && <td className="p-3">{respondentName(s)}</td>}
                      <td className="p-3 text-muted-foreground">
                        {s.createdAt
                          ? new Date(s.createdAt).toLocaleDateString("ar-SY", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {Number(s.mapLat).toFixed(4)}، {Number(s.mapLng).toFixed(4)}
                        </span>
                      </td>
                      <td className="p-3 max-w-[200px] truncate text-muted-foreground" title={answersSummary(s.answers)}>
                        {answersSummary(s.answers)}
                      </td>
                      {!onlyMine && (
                        <td className="p-3 text-center">
                          {!s.pointId ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={convertingId === s._id}
                              onClick={() => handleConvertToPoint(s._id)}
                            >
                              {convertingId === s._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "تحويل إلى نقطة"
                              )}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">تم التحويل</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
