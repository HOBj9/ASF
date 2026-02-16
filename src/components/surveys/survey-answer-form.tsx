"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { apiClient } from "@/lib/api/client"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, MapPin } from "lucide-react"

const MapPicker = dynamic(
  () => import("@/components/ui/map-picker").then((mod) => mod.MapPicker),
  { ssr: false, loading: () => <div className="h-[240px] rounded-lg border animate-pulse bg-muted" /> }
)

type Question = {
  _id?: string
  type: string
  questionText: string
  questionTextAr?: string
  options?: string[]
  required?: boolean
}

type Survey = {
  _id: string
  organizationId: string
  title: string
  titleAr?: string
  description?: string
  questions: Question[]
  isActive: boolean
}

export function SurveyAnswerForm({ surveyId }: { surveyId: string }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [mapLat, setMapLat] = useState(0)
  const [mapLng, setMapLng] = useState(0)
  const [deviceLat, setDeviceLat] = useState<number | null>(null)
  const [deviceLng, setDeviceLng] = useState<number | null>(null)
  const [currentLocationConfirmed, setCurrentLocationConfirmed] = useState<Record<number, boolean>>({})

  const loadSurvey = useCallback(async () => {
    setLoading(true)
    try {
      const res: any = await apiClient.get(`surveys/${surveyId}`)
      const s = res.survey || res.data?.survey
      if (!s) {
        toast.error("الاستبيان غير موجود")
        router.push("/dashboard/surveys")
        return
      }
      if (!s.isActive) {
        toast.error("الاستبيان غير نشط")
        router.push("/dashboard/surveys")
        return
      }
      setSurvey(s)
      if (s.questions?.length) {
        const initial: Record<string, unknown> = {}
        s.questions.forEach((q: Question, i: number) => {
          initial[`question_${i}`] = ""
        })
        setAnswers(initial)
      }
    } catch (e: any) {
      toast.error(e?.message || "فشل تحميل الاستبيان")
      router.push("/dashboard/surveys")
    } finally {
      setLoading(false)
    }
  }, [surveyId, router])

  useEffect(() => {
    loadSurvey()
  }, [loadSurvey])

  const captureDeviceLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("المتصفح لا يدعم الموقع")
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeviceLat(pos.coords.latitude)
        setDeviceLng(pos.coords.longitude)
        toast.success("تم أخذ الموقع الحالي")
      },
      () => toast.error("لم يتم الحصول على الموقع"),
      { enableHighAccuracy: true }
    )
  }, [])

  const setAnswer = (key: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    if (!survey) return
    if (mapLat === 0 && mapLng === 0) {
      toast.error("حدد موقع النقطة على الخريطة")
      return
    }
    const required = survey.questions?.filter((q) => q.required) || []
    for (let i = 0; i < required.length; i++) {
      const key = `question_${survey.questions.indexOf(required[i])}`
      if (answers[key] === undefined || answers[key] === "" || answers[key] === null) {
        toast.error(`مطلوب: ${required[i].questionTextAr || required[i].questionText}`)
        return
      }
    }

    setSubmitting(true)
    try {
      await apiClient.post(
        `organizations/${survey.organizationId}/surveys/${surveyId}/submit`,
        {
          mapLat,
          mapLng,
          deviceLat,
          deviceLng,
          answers,
        }
      )
      toast.success("تم إرسال الإجابة وإنشاء النقطة. يمكنك تعبئة النموذج وإرسال إجابة جديدة.")
      // إفراغ الحقول للإرسال مرة أخرى
      if (survey.questions?.length) {
        const initial: Record<string, unknown> = {}
        survey.questions.forEach((_q: Question, i: number) => {
          initial[`question_${i}`] = ""
        })
        setAnswers(initial)
      }
      setMapLat(0)
      setMapLng(0)
      setDeviceLat(null)
      setDeviceLng(null)
      setCurrentLocationConfirmed({})
    } catch (e: any) {
      toast.error(e?.message || "فشل الإرسال")
    } finally {
      setSubmitting(false)
    }
  }

  const confirmCurrentLocationForQuestion = (index: number) => {
    if (deviceLat != null && deviceLng != null) {
      setMapLat(deviceLat)
      setMapLng(deviceLng)
      setCurrentLocationConfirmed((prev) => ({ ...prev, [index]: true }))
      setAnswer(`question_${index}_lat`, deviceLat)
      setAnswer(`question_${index}_lng`, deviceLng)
      toast.success("تم استخدام الموقع الحالي")
    } else {
      captureDeviceLocation()
    }
  }

  if (loading || !survey) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{survey.titleAr || survey.title}</CardTitle>
        {survey.description && (
          <p className="text-sm text-muted-foreground">{survey.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {survey.questions?.map((q, index) => (
          <div key={index} className="space-y-2">
            <Label>
              {q.questionTextAr || q.questionText}
              {q.required && <span className="text-destructive mr-1">*</span>}
            </Label>
            {q.type === "text" && (
              <Input
                value={(answers[`question_${index}`] as string) ?? ""}
                onChange={(e) => setAnswer(`question_${index}`, e.target.value)}
                placeholder="أدخل النص"
                className="text-right"
              />
            )}
            {q.type === "choice" && (
              <RadioGroup
                value={(answers[`question_${index}`] as string) ?? ""}
                onValueChange={(v) => setAnswer(`question_${index}`, v)}
                className="flex flex-col gap-2"
              >
                {(q.options || []).map((opt, i) => (
                  <div key={i} className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value={opt} id={`q${index}-${i}`} />
                    <Label htmlFor={`q${index}-${i}`} className="font-normal cursor-pointer">
                      {opt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
            {q.type === "current_location" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => confirmCurrentLocationForQuestion(index)}
                  >
                    <MapPin className="h-4 w-4 ml-2" />
                    أخذ الموقع الحالي
                  </Button>
                  {deviceLat != null && deviceLng != null && (
                    <span className="text-sm text-muted-foreground">
                      {deviceLat.toFixed(5)}, {deviceLng.toFixed(5)}
                    </span>
                  )}
                </div>
                {currentLocationConfirmed[index] && (
                  <div className="rounded-lg border p-2 bg-muted/50 text-sm">
                    تم استخدام الموقع الحالي وعرضه على الخريطة أدناه. يمكنك تعديل الموقع بالنقر على الخريطة.
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <div className="space-y-2">
          <Label>موقع النقطة على الخريطة (مطلوب)</Label>
          <p className="text-xs text-muted-foreground">انقر على الخريطة لتحديد موقع النقطة</p>
          <MapPicker
            lat={mapLat}
            lng={mapLng}
            onSelect={(lat, lng) => {
              setMapLat(lat)
              setMapLng(lng)
            }}
            height="280px"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={captureDeviceLocation}>
            <MapPin className="h-4 w-4 ml-2" />
            تسجيل موقع الجهاز الحالي
          </Button>
          {deviceLat != null && deviceLng != null && (
            <span className="text-sm text-muted-foreground">
              تم: {deviceLat.toFixed(5)}, {deviceLng.toFixed(5)}
            </span>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin ml-2" />
          ) : null}
          إرسال
        </Button>
      </CardContent>
    </Card>
  )
}
