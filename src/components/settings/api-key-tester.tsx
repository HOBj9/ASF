"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useApiQuery } from "@/lib/hooks/use-api-query"
import { getRequest } from "@/lib/api/helpers"

interface ApiKeyTesterProps {
  apiKey?: string | null
}

export function ApiKeyTester({ apiKey: propApiKey }: ApiKeyTesterProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("+963956820831")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    data?: any
    error?: string
  } | null>(null)
  const [manualApiKey, setManualApiKey] = useState("")

  // Get API key info to check if it exists
  const { data: apiKeyData } = useApiQuery(
    ['api-key'],
    getRequest('settings/api-key')
  )

  const apiKeyExists = apiKeyData?.data?.exists === true

  // Load API key from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !propApiKey) {
      const stored = localStorage.getItem('api_key')
      if (stored) {
        setManualApiKey(stored)
      }
    }
  }, [propApiKey])

  // Get API key from prop, localStorage, or manual input
  const getApiKey = () => {
    if (propApiKey) return propApiKey
    if (manualApiKey) return manualApiKey
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('api_key')
      if (stored) return stored
    }
    return null
  }

  const apiKey = getApiKey()

  const handleTest = async () => {
    if (!apiKey) {
      setResult({
        success: false,
        error: "لا يوجد API key. يرجى إنشاء API key أولاً",
      })
      return
    }

    if (!username.trim()) {
      setResult({
        success: false,
        error: "يرجى إدخال اسم المستخدم (البريد الإلكتروني)",
      })
      return
    }

    if (!password.trim()) {
      setResult({
        success: false,
        error: "يرجى إدخال كلمة المرور",
      })
      return
    }

    if (!phoneNumber.trim()) {
      setResult({
        success: false,
        error: "يرجى إدخال رقم الهاتف",
      })
      return
    }

    if (!message.trim()) {
      setResult({
        success: false,
        error: "يرجى إدخال نص الرسالة",
      })
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/v1/send-message', {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
          phoneNumber: phoneNumber.trim(),
          message: message.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResult({
          success: true,
          data: data.data,
        })
      } else {
        setResult({
          success: false,
          error: data.error || 'حدث خطأ غير معروف',
        })
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'فشل في إرسال الطلب',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!apiKeyExists) {
    return null
  }

  return (
    <Card className="text-right">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          اختبار API Key
        </CardTitle>
        <CardDescription>
          قم باختبار API key الخاص بك بإرسال رسالة تجريبية
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="test-username">اسم المستخدم (البريد الإلكتروني)</Label>
          <Input
            id="test-username"
            type="email"
            placeholder="user@example.com"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            className="text-right"
            dir="ltr"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="test-password">كلمة المرور</Label>
          <Input
            id="test-password"
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="text-right"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="test-phone">رقم الهاتف</Label>
          <Input
            id="test-phone"
            type="text"
            placeholder="+963956820831"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={isLoading}
            className="text-right"
            dir="ltr"
          />
          <p className="text-xs text-muted-foreground">
            يجب أن يكون بالصيغة الدولية (مثال: +963956820831)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="test-message">نص الرسالة</Label>
          <Textarea
            id="test-message"
            placeholder="أدخل نص الرسالة هنا..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isLoading}
            className="text-right min-h-[100px]"
            maxLength={4096}
          />
          <p className="text-xs text-muted-foreground">
            {message.length} / 4096 حرف
          </p>
        </div>

        <Button
          onClick={handleTest}
          disabled={isLoading || !apiKey}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              جاري الإرسال...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 ml-2" />
              إرسال رسالة تجريبية
            </>
          )}
        </Button>

        {result && (
          <Alert
            className={
              result.success
                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                : "border-red-500 bg-red-50 dark:bg-red-900/20"
            }
          >
            {result.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
            <AlertDescription className="space-y-2">
              <p
                className={
                  result.success
                    ? "font-semibold text-green-800 dark:text-green-200"
                    : "font-semibold text-red-800 dark:text-red-200"
                }
              >
                {result.success ? "✅ تم إرسال الرسالة بنجاح!" : "❌ فشل في إرسال الرسالة"}
              </p>
              {result.success && result.data && (
                <div className="text-sm space-y-1">
                  <p className="text-green-700 dark:text-green-300">
                    <strong>Message ID:</strong> {result.data.messageId || "N/A"}
                  </p>
                  <p className="text-green-700 dark:text-green-300">
                    <strong>Phone Number:</strong> {result.data.phoneNumber}
                  </p>
                  <p className="text-green-700 dark:text-green-300">
                    <strong>Sent At:</strong> {result.data.sentAt ? new Date(result.data.sentAt).toLocaleString('ar-SA') : "N/A"}
                  </p>
                </div>
              )}
              {!result.success && result.error && (
                <p className="text-sm text-red-700 dark:text-red-300">
                  {result.error}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {!apiKey && (
          <div className="space-y-4">
            <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertDescription>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  لا يوجد API key. يرجى إدخال API key يدوياً أو إنشاء واحد من القسم أعلاه.
                </p>
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="manual-api-key">أدخل API Key يدوياً (اختياري)</Label>
              <Input
                id="manual-api-key"
                type="text"
                placeholder="أدخل API key هنا..."
                value={manualApiKey}
                onChange={(e) => setManualApiKey(e.target.value)}
                disabled={isLoading}
                className="text-right font-mono"
                dir="ltr"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

