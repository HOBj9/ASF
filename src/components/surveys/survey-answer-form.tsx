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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, MapPin, ChevronRight, ChevronLeft } from "lucide-react"
import { Stepper } from "@/components/ui/stepper"

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
  const [currentStep, setCurrentStep] = useState(0)
  const [pointName, setPointName] = useState("")
  const [primaryClassificationId, setPrimaryClassificationId] = useState<string>("")
  const [secondaryClassificationId, setSecondaryClassificationId] = useState<string>("")
  const [otherIdentifier, setOtherIdentifier] = useState("")
  const [classifications, setClassifications] = useState<{
    primaries: { _id: string; name: string; nameAr?: string | null }[]
    secondaries: { _id: string; primaryClassificationId: string; name: string; nameAr?: string | null }[]
  }>({ primaries: [], secondaries: [] })

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
      setPointName("")
      setPrimaryClassificationId("")
      setSecondaryClassificationId("")
      setOtherIdentifier("")
      setCurrentStep(0)
      const userBranchId = (session?.user as any)?.branchId
      if (userBranchId || s.organizationId) {
        try {
          const classificationQuery = userBranchId
            ? `points/classifications?branchId=${userBranchId}`
            : `points/classifications?organizationId=${s.organizationId}`
          const clsRes: any = await apiClient.get(classificationQuery)
          setClassifications({ primaries: clsRes.primaries || [], secondaries: clsRes.secondaries || [] })
        } catch {
          setClassifications({ primaries: [], secondaries: [] })
        }
      }
    } catch (e: any) {
      toast.error(e?.message || "فشل تحميل الاستبيان")
      router.push("/dashboard/surveys")
    } finally {
      setLoading(false)
    }
  }, [surveyId, router, session])

  useEffect(() => {
    loadSurvey()
  }, [loadSurvey])

  const captureDeviceLocation = useCallback((alsoSetMap = false) => {
    if (!navigator.geolocation) {
      toast.error("المتصفح لا يدعم الموقع")
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setDeviceLat(lat)
        setDeviceLng(lng)
        if (alsoSetMap) {
          setMapLat(lat)
          setMapLng(lng)
        }
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
    if (!pointName.trim()) {
      toast.error("اسم النقطة مطلوب")
      return
    }
    if (!primaryClassificationId) {
      toast.error("الفئة الأساسية مطلوبة")
      return
    }
    if (!secondaryClassificationId) {
      toast.error("الفئة الفرعية مطلوبة")
      return
    }
    if (!otherIdentifier.trim()) {
      toast.error("الرقم التعريفي الآخر مطلوب")
      return
    }
    if (mapLat === 0 && mapLng === 0) {
      toast.error("حدد موقع النقطة على الخريطة")
      return
    }
    const required = survey.questions?.filter((q) => q.required) || []
    for (let i = 0; i < required.length; i++) {
      const question = required[i]
      const qIndex = survey.questions.indexOf(question)
      const key = `question_${qIndex}`
      // أسئلة الموقع الحالي: تعتبر مُجابة إذا تم تحديد نقطة على الخريطة
      if (question.type === "current_location") {
        if (mapLat === 0 && mapLng === 0) {
          toast.error(`مطلوب: ${question.questionTextAr || question.questionText}`)
          return
        }
        continue
      }
      if (answers[key] === undefined || answers[key] === "" || answers[key] === null) {
        toast.error(`مطلوب: ${question.questionTextAr || question.questionText}`)
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
          answers: {
            ...answers,
            pointName: pointName.trim(),
            primaryClassificationId,
            secondaryClassificationId,
            otherIdentifier: otherIdentifier.trim(),
          },
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
      setPointName("")
      setPrimaryClassificationId("")
      setSecondaryClassificationId("")
      setOtherIdentifier("")
      setCurrentStep(0)
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
      setAnswer(`question_${index}`, "confirmed")
      setAnswer(`question_${index}_lat`, deviceLat)
      setAnswer(`question_${index}_lng`, deviceLng)
      syncMapLocationToCurrentLocationAnswers(deviceLat, deviceLng)
      toast.success("تم استخدام الموقع الحالي")
    } else {
      captureDeviceLocation(true)
    }
  }

  const syncMapLocationToCurrentLocationAnswers = useCallback((lat: number, lng: number) => {
    if (!survey?.questions?.length) return
    setAnswers((prev) => {
      const next = { ...prev }
      survey.questions.forEach((q, i) => {
        if (q.type === "current_location") next[`question_${i}`] = `${lat},${lng}`
      })
      return next
    })
  }, [survey])

  const handleMapSelect = useCallback((lat: number, lng: number) => {
    setMapLat(lat)
    setMapLng(lng)
    syncMapLocationToCurrentLocationAnswers(lat, lng)
  }, [syncMapLocationToCurrentLocationAnswers])

  if (loading || !survey) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const questions = survey.questions ?? []
  const steps = [
    { title: "بيانات النقطة", description: "اسم النقطة، الفئات الأساسية والفرعية، الرقم التعريفي" },
    ...questions.map((q) => ({ title: q.questionTextAr || q.questionText })),
    { title: "موقع النقطة على الخريطة", description: "حدد الموقع على الخريطة أو استخدم موقع الجهاز" },
  ]
  const totalSteps = steps.length
  const isPointDataStep = currentStep === 0
  const isMapStep = currentStep === questions.length + 1
  const isLastStep = currentStep === totalSteps - 1

  const isCurrentStepValid = (): boolean => {
    if (currentStep === 0) {
      return (
        pointName.trim() !== "" &&
        !!primaryClassificationId &&
        !!secondaryClassificationId &&
        otherIdentifier.trim() !== ""
      )
    }
    if (currentStep >= questions.length + 1) return mapLat !== 0 && mapLng !== 0
    const q = questions[currentStep - 1]
    if (q.type === "current_location") return true
    if (q.required) {
      const val = answers[`question_${currentStep - 1}`]
      return val !== undefined && val !== "" && val !== null
    }
    return true
  }

  const goNext = () => {
    if (currentStep < totalSteps - 1) setCurrentStep((s) => s + 1)
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
        <Stepper steps={steps} currentStep={currentStep + 1} className="mb-6" />

        {isPointDataStep && (
          <div className="space-y-4 min-h-[200px]">
            {classifications.primaries.length === 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                لا توجد فئات. يرجى طلب إضافة الفئات من مدير المؤسسة (فئات النقاط الأساسية والفرعية) أولاً.
              </p>
            )}
            <div>
              <Label className="text-base">اسم النقطة <span className="text-destructive">*</span></Label>
              <Input
                value={pointName}
                onChange={(e) => setPointName(e.target.value)}
                placeholder="أدخل اسم النقطة"
                className="text-right mt-1"
              />
            </div>
            <div>
              <Label className="text-base">الفئة الأساسية <span className="text-destructive">*</span></Label>
              <Select value={primaryClassificationId} onValueChange={(v) => { setPrimaryClassificationId(v); setSecondaryClassificationId("") }}>
                <SelectTrigger className="text-right mt-1">
                  <SelectValue placeholder="اختر الفئة الأساسية" />
                </SelectTrigger>
                <SelectContent>
                  {classifications.primaries.map((p) => (
                    <SelectItem key={p._id} value={p._id}>{p.nameAr || p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-base">الفئة الفرعية <span className="text-destructive">*</span></Label>
              <Select value={secondaryClassificationId} onValueChange={setSecondaryClassificationId} disabled={!primaryClassificationId}>
                <SelectTrigger className="text-right mt-1">
                  <SelectValue placeholder="اختر الفئة الفرعية" />
                </SelectTrigger>
                <SelectContent>
                  {classifications.secondaries
                    .filter((s) => String(s.primaryClassificationId) === primaryClassificationId)
                    .map((s) => (
                      <SelectItem key={s._id} value={s._id}>{s.nameAr || s.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-base">الرقم التعريفي الآخر <span className="text-destructive">*</span></Label>
              <Input
                value={otherIdentifier}
                onChange={(e) => setOtherIdentifier(e.target.value)}
                placeholder="مثال: STR-001"
                className="text-right mt-1"
              />
            </div>
          </div>
        )}

        {!isMapStep && !isPointDataStep && questions[currentStep - 1] && (() => {
          const q = questions[currentStep - 1]
          const index = currentStep - 1
          return (
            <div className="space-y-4 min-h-[200px]">
              <Label className="text-base">
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
                      size="sm"
                      onClick={() => confirmCurrentLocationForQuestion(index)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
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
                      تم استخدام الموقع الحالي وعرضه على الخريطة. في الخطوة التالية حدد/عدّل الموقع على الخريطة.
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })()}

        {isMapStep && (
          <div className="space-y-4 min-h-[320px]">
            <Label className="text-base">موقع النقطة على الخريطة (مطلوب)</Label>
            <p className="text-xs text-muted-foreground">انقر على الخريطة لتحديد موقع النقطة أو استخدم زر موقع الجهاز</p>
            <MapPicker
              lat={mapLat}
              lng={mapLng}
              onSelect={handleMapSelect}
              height="280px"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => captureDeviceLocation(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
              >
                <MapPin className="h-4 w-4 ml-2" />
                تسجيل موقع الجهاز الحالي
              </Button>
              {deviceLat != null && deviceLng != null && (
                <span className="text-sm text-muted-foreground">
                  تم: {deviceLat.toFixed(5)}, {deviceLng.toFixed(5)}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep((s) => s - 1)}
            disabled={currentStep === 0}
          >
            <ChevronRight className="h-4 w-4 ml-1" />
            السابق
          </Button>
          {!isLastStep ? (
            <Button type="button" onClick={goNext} disabled={!isCurrentStepValid()}>
              التالي
              <ChevronLeft className="h-4 w-4 mr-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting || !isCurrentStepValid()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              إرسال
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
