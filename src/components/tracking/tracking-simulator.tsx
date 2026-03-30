"use client"

import { useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

type MobileLoginResponse = {
  accessToken: string
  tokenType: "Bearer"
  expiresAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
    organizationId: string | null
    branchId: string | null
    trackingVehicleId: string | null
  }
  tracking: {
    canActivate: boolean
  }
}

type ActivationResponse = {
  trackingToken: string
  binding: Record<string, unknown> | null
  vehicle: {
    _id: string
    name: string
    plateNumber: string | null
    trackingProvider: "mobile_app"
  }
}

type TrackingSample = {
  recordedAt: string
  lat: number
  lng: number
  speed?: number | null
  heading?: number | null
  accuracy?: number | null
  altitude?: number | null
}

type IngestResponse = {
  success: boolean
  duplicate: boolean
  ingressId: string | null
  acceptedSamples?: number
  lateSamples?: number
}

type LogEntry = {
  id: string
  level: "info" | "success" | "error"
  message: string
  createdAt: string
}

type ManualPointState = {
  lat: string
  lng: string
  speed: string
  heading: string
  accuracy: string
  altitude: string
}

const DEFAULT_MANUAL_POINT: ManualPointState = {
  lat: "33.5138",
  lng: "36.2765",
  speed: "0",
  heading: "0",
  accuracy: "10",
  altitude: "",
}

function createDeviceId() {
  return `browser-${Date.now()}`
}

function createBatchId() {
  return `browser-batch-${Date.now()}`
}

function parseOptionalNumber(value: string) {
  const normalized = String(value || "").trim()
  if (!normalized) return null
  const numeric = Number(normalized)
  return Number.isFinite(numeric) ? numeric : null
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2)
}

async function readResponseJson(response: Response) {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

function buildManualSample(point: ManualPointState): TrackingSample | null {
  const lat = Number(point.lat)
  const lng = Number(point.lng)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  return {
    recordedAt: new Date().toISOString(),
    lat,
    lng,
    speed: parseOptionalNumber(point.speed),
    heading: parseOptionalNumber(point.heading),
    accuracy: parseOptionalNumber(point.accuracy),
    altitude: parseOptionalNumber(point.altitude),
  }
}

export function TrackingSimulator() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [deviceId, setDeviceId] = useState(createDeviceId)
  const [deviceName, setDeviceName] = useState("محاكي المتصفح")
  const [platform, setPlatform] = useState("ويب")
  const [appVersion, setAppVersion] = useState("المحاكي-1.0.0")
  const [manualPoint, setManualPoint] = useState<ManualPointState>(DEFAULT_MANUAL_POINT)
  const [captureIntervalSeconds, setCaptureIntervalSeconds] = useState("10")
  const [sendIntervalSeconds, setSendIntervalSeconds] = useState("30")
  const [autoSendEnabled, setAutoSendEnabled] = useState(true)
  const [captureMode, setCaptureMode] = useState<"browser" | "simulate" | null>(null)
  const [accessToken, setAccessToken] = useState("")
  const [trackingToken, setTrackingToken] = useState("")
  const [loginResult, setLoginResult] = useState<MobileLoginResponse | null>(null)
  const [activationResult, setActivationResult] = useState<ActivationResponse | null>(null)
  const [lastIngestResult, setLastIngestResult] = useState<IngestResponse | null>(null)
  const [sampleQueue, setSampleQueue] = useState<TrackingSample[]>([])
  const [lastSample, setLastSample] = useState<TrackingSample | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loginLoading, setLoginLoading] = useState(false)
  const [activationLoading, setActivationLoading] = useState(false)
  const [ingestLoading, setIngestLoading] = useState(false)

  const queueRef = useRef<TrackingSample[]>([])
  const lastSampleRef = useRef<TrackingSample | null>(null)
  const manualPointRef = useRef<ManualPointState>(manualPoint)
  const trackingTokenRef = useRef("")
  const ingestLoadingRef = useRef(false)
  const sendQueuedBatchRef = useRef<() => Promise<void>>(async () => {})
  const collectBrowserSampleRef = useRef<() => Promise<void>>(async () => {})
  const collectSimulatedSampleRef = useRef<() => void>(() => {})

  useEffect(() => {
    queueRef.current = sampleQueue
  }, [sampleQueue])

  useEffect(() => {
    lastSampleRef.current = lastSample
  }, [lastSample])

  useEffect(() => {
    manualPointRef.current = manualPoint
  }, [manualPoint])

  useEffect(() => {
    trackingTokenRef.current = trackingToken
  }, [trackingToken])

  useEffect(() => {
    ingestLoadingRef.current = ingestLoading
  }, [ingestLoading])

  const appendLog = (message: string, level: LogEntry["level"] = "info") => {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level,
      message,
      createdAt: new Date().toISOString(),
    }

    setLogs((current) => [entry, ...current].slice(0, 30))
  }

  const enqueueSample = (sample: TrackingSample, source: string) => {
    setSampleQueue((current) => [...current, sample])
    setLastSample(sample)
    setManualPoint((current) => ({
      ...current,
      lat: String(sample.lat),
      lng: String(sample.lng),
      speed: sample.speed != null ? String(sample.speed) : current.speed,
      heading: sample.heading != null ? String(sample.heading) : current.heading,
      accuracy: sample.accuracy != null ? String(sample.accuracy) : current.accuracy,
      altitude: sample.altitude != null ? String(sample.altitude) : current.altitude,
    }))
    appendLog(`تمت إضافة نقطة واحدة من ${source}`, "success")
  }

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("البريد الإلكتروني وكلمة المرور مطلوبان")
      return
    }

    setLoginLoading(true)
    try {
      const response = await fetch("/api/tracking/mobile/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = (await readResponseJson(response)) as MobileLoginResponse & { error?: string }
      if (!response.ok) {
        throw new Error(data.error || "فشل تسجيل الدخول")
      }

      setLoginResult(data)
      setAccessToken(data.accessToken)
      appendLog(`تم تسجيل الدخول باسم ${data.user.name}`, "success")
      toast.success("تم تسجيل الدخول بنجاح")
    } catch (error: any) {
      const message = error?.message || "فشل تسجيل الدخول"
      appendLog(message, "error")
      toast.error(message)
    } finally {
      setLoginLoading(false)
    }
  }

  const handleActivate = async () => {
    if (!accessToken) {
      toast.error("يجب تسجيل الدخول أولاً")
      return
    }

    setActivationLoading(true)
    try {
      const response = await fetch("/api/tracking/mobile/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          deviceId,
          deviceName,
          platform,
          appVersion,
        }),
      })

      const data = (await readResponseJson(response)) as ActivationResponse & { error?: string }
      if (!response.ok) {
        throw new Error(data.error || "فشل تفعيل التتبع")
      }

      setActivationResult(data)
      setTrackingToken(data.trackingToken)
      appendLog(`تم تفعيل تتبع الموبايل للمركبة ${data.vehicle.name}`, "success")
      toast.success("تم تفعيل التتبع")
    } catch (error: any) {
      const message = error?.message || "فشل تفعيل التتبع"
      appendLog(message, "error")
      toast.error(message)
    } finally {
      setActivationLoading(false)
    }
  }

  const collectBrowserSample = async () => {
    if (!navigator.geolocation) {
      throw new Error("خدمة تحديد الموقع غير متاحة في هذا المتصفح")
    }

    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      })
    })

    enqueueSample(
      {
        recordedAt: new Date().toISOString(),
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        speed: position.coords.speed ?? null,
        heading: position.coords.heading ?? null,
        accuracy: position.coords.accuracy ?? null,
        altitude: position.coords.altitude ?? null,
      },
      "GPS المتصفح"
    )
  }

  const collectSimulatedSample = () => {
    const baseSample = lastSampleRef.current || buildManualSample(manualPointRef.current)
    if (!baseSample) {
      throw new Error("أدخل نقطة يدوية صحيحة أولاً")
    }

    const latOffset = (Math.random() - 0.5) * 0.00045
    const lngOffset = (Math.random() - 0.5) * 0.00045

    enqueueSample(
      {
        recordedAt: new Date().toISOString(),
        lat: Number((baseSample.lat + latOffset).toFixed(6)),
        lng: Number((baseSample.lng + lngOffset).toFixed(6)),
        speed: baseSample.speed ?? 8,
        heading: baseSample.heading ?? Math.round(Math.random() * 360),
        accuracy: baseSample.accuracy ?? 12,
        altitude: baseSample.altitude ?? null,
      },
      "المحاكي"
    )
  }

  const addManualSample = () => {
    const sample = buildManualSample(manualPoint)
    if (!sample) {
      toast.error("خط العرض وخط الطول اليدويان مطلوبان")
      return
    }
    enqueueSample(sample, "الإدخال اليدوي")
    toast.success("تمت إضافة النقطة اليدوية إلى الطابور")
  }

  const sendQueuedBatch = async () => {
    if (!trackingTokenRef.current) {
      toast.error("فعّل التتبع أولاً")
      return
    }

    if (queueRef.current.length === 0) {
      toast.error("الطابور فارغ")
      return
    }

    setIngestLoading(true)
    try {
      const response = await fetch("/api/tracking/mobile/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tracking-Token": trackingTokenRef.current,
        },
        body: JSON.stringify({
          batchId: createBatchId(),
          sentAt: new Date().toISOString(),
          samples: queueRef.current,
        }),
      })

      const data = (await readResponseJson(response)) as IngestResponse & { error?: string }
      if (!response.ok) {
        throw new Error(data.error || "فشل إرسال الدفعة")
      }

      setLastIngestResult(data)
      setSampleQueue([])
      appendLog(`تم إرسال دفعة تحتوي على ${queueRef.current.length} نقطة`, "success")
      toast.success("تم إرسال الدفعة بنجاح")
    } catch (error: any) {
      const message = error?.message || "فشل إرسال الدفعة"
      appendLog(message, "error")
      toast.error(message)
    } finally {
      setIngestLoading(false)
    }
  }

  collectBrowserSampleRef.current = async () => {
    try {
      await collectBrowserSample()
    } catch (error: any) {
      appendLog(error?.message || "فشل التقاط موقع المتصفح", "error")
    }
  }

  collectSimulatedSampleRef.current = () => {
    try {
      collectSimulatedSample()
    } catch (error: any) {
      appendLog(error?.message || "فشل الالتقاط التجريبي", "error")
    }
  }

  sendQueuedBatchRef.current = async () => {
    await sendQueuedBatch()
  }

  useEffect(() => {
    const captureEveryMs = Math.max(3, Number(captureIntervalSeconds) || 10) * 1000
    if (!captureMode) return undefined

    const entry: LogEntry = {
      id: `${Date.now()}-capture-start`,
      level: "info",
      message: `تم تشغيل وضع الالتقاط: ${captureMode}`,
      createdAt: new Date().toISOString(),
    }

    setLogs((current) => [entry, ...current].slice(0, 30))
    const intervalId = window.setInterval(() => {
      if (captureMode === "browser") {
        void collectBrowserSampleRef.current()
        return
      }

      collectSimulatedSampleRef.current()
    }, captureEveryMs)

    return () => window.clearInterval(intervalId)
  }, [captureMode, captureIntervalSeconds])

  useEffect(() => {
    const sendEveryMs = Math.max(5, Number(sendIntervalSeconds) || 30) * 1000
    if (!autoSendEnabled) return undefined

    const intervalId = window.setInterval(() => {
      if (!trackingTokenRef.current || queueRef.current.length === 0 || ingestLoadingRef.current) {
        return
      }

      void sendQueuedBatchRef.current()
    }, sendEveryMs)

    return () => window.clearInterval(intervalId)
  }, [autoSendEnabled, sendIntervalSeconds])

  const resetSimulator = () => {
    setAccessToken("")
    setTrackingToken("")
    setLoginResult(null)
    setActivationResult(null)
    setLastIngestResult(null)
    setSampleQueue([])
    setLastSample(null)
    setLogs([])
    setCaptureMode(null)
    setPassword("")
    setDeviceId(createDeviceId())
    appendLog("تمت إعادة تعيين حالة المحاكي")
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>1. تسجيل دخول مشرف الخط</CardTitle>
            <CardDescription>
              استخدم نفس بيانات الدخول التي سيستعملها تطبيق الموبايل عبر واجهة تسجيل الدخول الخاصة بالموبايل.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sim-email">البريد الإلكتروني</Label>
                <Input id="sim-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sim-password">كلمة المرور</Label>
                <Input id="sim-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={resetSimulator}>إعادة تعيين</Button>
              <Button onClick={handleLogin} loading={loginLoading}>تسجيل الدخول</Button>
            </div>
            <Textarea value={formatJson(loginResult)} readOnly className="min-h-[180px] font-mono text-xs" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. تفعيل الجهاز</CardTitle>
            <CardDescription>
              يُصدر هذا الإجراء رمز التتبع الذي سيستخدمه التطبيق لاحقاً عند إرسال دفعات GPS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sim-device-id">معرّف الجهاز</Label>
                <Input id="sim-device-id" value={deviceId} onChange={(event) => setDeviceId(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sim-device-name">اسم الجهاز</Label>
                <Input id="sim-device-name" value={deviceName} onChange={(event) => setDeviceName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sim-platform">المنصة</Label>
                <Input id="sim-platform" value={platform} onChange={(event) => setPlatform(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sim-app-version">إصدار التطبيق</Label>
                <Input id="sim-app-version" value={appVersion} onChange={(event) => setAppVersion(event.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleActivate} loading={activationLoading} disabled={!accessToken}>
                تفعيل التتبع
              </Button>
            </div>
            <Textarea value={formatJson(activationResult)} readOnly className="min-h-[220px] font-mono text-xs" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. جمع النقاط وإرسال الدفعات</CardTitle>
            <CardDescription>
              يمكنك إضافة نقاط يدويًا، أو التقاط GPS من المتصفح، أو محاكاة الحركة، أو تشغيل الالتقاط التلقائي.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="capture-interval">فاصل الالتقاط (بالثواني)</Label>
                <Input id="capture-interval" type="number" min="3" value={captureIntervalSeconds} onChange={(event) => setCaptureIntervalSeconds(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="send-interval">فاصل الإرسال التلقائي (بالثواني)</Label>
                <Input id="send-interval" type="number" min="5" value={sendIntervalSeconds} onChange={(event) => setSendIntervalSeconds(event.target.value)} />
              </div>
              <div className="flex items-end justify-between rounded-lg border px-4 py-3">
                <div className="space-y-1 text-right">
                  <p className="text-sm font-medium">إرسال النقاط المؤجلة تلقائياً</p>
                  <p className="text-xs text-muted-foreground">يرسل دفعة تلقائياً ما دامت هناك نقاط في الطابور</p>
                </div>
                <Switch checked={autoSendEnabled} onCheckedChange={setAutoSendEnabled} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="manual-lat">خط العرض</Label>
                <Input id="manual-lat" type="number" step="0.000001" value={manualPoint.lat} onChange={(event) => setManualPoint((current) => ({ ...current, lat: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-lng">خط الطول</Label>
                <Input id="manual-lng" type="number" step="0.000001" value={manualPoint.lng} onChange={(event) => setManualPoint((current) => ({ ...current, lng: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-speed">السرعة</Label>
                <Input id="manual-speed" type="number" step="0.1" value={manualPoint.speed} onChange={(event) => setManualPoint((current) => ({ ...current, speed: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-heading">الاتجاه</Label>
                <Input id="manual-heading" type="number" step="1" value={manualPoint.heading} onChange={(event) => setManualPoint((current) => ({ ...current, heading: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-accuracy">الدقة</Label>
                <Input id="manual-accuracy" type="number" step="0.1" value={manualPoint.accuracy} onChange={(event) => setManualPoint((current) => ({ ...current, accuracy: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-altitude">الارتفاع</Label>
                <Input id="manual-altitude" type="number" step="0.1" value={manualPoint.altitude} onChange={(event) => setManualPoint((current) => ({ ...current, altitude: event.target.value }))} />
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={addManualSample}>إضافة نقطة يدوية</Button>
              <Button variant="outline" onClick={() => void collectBrowserSampleRef.current()}>التقاط GPS من المتصفح</Button>
              <Button variant="outline" onClick={() => collectSimulatedSampleRef.current()}>إضافة نقطة تجريبية</Button>
              <Button variant={captureMode === "browser" ? "secondary" : "default"} onClick={() => setCaptureMode("browser")}>
                بدء التقاط المتصفح
              </Button>
              <Button variant={captureMode === "simulate" ? "secondary" : "default"} onClick={() => setCaptureMode("simulate")}>
                بدء الالتقاط التجريبي
              </Button>
              <Button variant="destructive" onClick={() => setCaptureMode(null)} disabled={!captureMode}>
                إيقاف الالتقاط
              </Button>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={() => setSampleQueue([])} disabled={sampleQueue.length === 0}>
                تفريغ الطابور
              </Button>
              <Button onClick={() => void sendQueuedBatch()} loading={ingestLoading} disabled={!trackingToken || sampleQueue.length === 0}>
                إرسال الدفعة الآن
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>الحالة الحالية</CardTitle>
            <CardDescription>
              نظرة سريعة على حالة المحاكي الحالية.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-lg border p-4 text-right">
              <div className="text-muted-foreground">يمكن التفعيل</div>
              <div className="mt-1 text-lg font-semibold">{loginResult?.tracking.canActivate ? "نعم" : "لا"}</div>
            </div>
            <div className="rounded-lg border p-4 text-right">
              <div className="text-muted-foreground">وضع الالتقاط</div>
              <div className="mt-1 text-lg font-semibold">{captureMode === "browser" ? "GPS المتصفح" : captureMode === "simulate" ? "محاكاة الحركة" : "متوقف"}</div>
            </div>
            <div className="rounded-lg border p-4 text-right">
              <div className="text-muted-foreground">النقاط المؤجلة</div>
              <div className="mt-1 text-lg font-semibold">{sampleQueue.length}</div>
            </div>
            <div className="rounded-lg border p-4 text-right">
              <div className="text-muted-foreground">رمز التتبع</div>
              <div className="mt-1 break-all text-xs font-medium">{trackingToken || "لم يتم التفعيل بعد"}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>النقاط المؤجلة</CardTitle>
            <CardDescription>
              سيتم إرسال هذه النقاط ضمن الدفعة التالية إلى `/api/tracking/mobile/ingest`.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea value={formatJson(sampleQueue)} readOnly className="min-h-[260px] font-mono text-xs" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>آخر نتيجة استقبال</CardTitle>
            <CardDescription>
              استخدم هذا مع لوحة مراقبة التتبع للتحقق من العملية كاملة من البداية إلى النهاية.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea value={formatJson(lastIngestResult)} readOnly className="min-h-[180px] font-mono text-xs" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>سجل النشاط</CardTitle>
            <CardDescription>
              أحدث الإجراءات التي نفذها المحاكي.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {logs.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                لا يوجد نشاط بعد
              </div>
            ) : (
              logs.map((entry) => (
                <div key={entry.id} className="rounded-lg border p-3 text-right">
                  <div className="text-xs text-muted-foreground">{entry.createdAt}</div>
                  <div className="mt-1 text-sm font-medium">{entry.message}</div>
                  <div className="mt-1 text-xs uppercase text-muted-foreground">{entry.level === "success" ? "نجاح" : entry.level === "error" ? "خطأ" : "معلومة"}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
