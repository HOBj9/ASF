"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApiQuery, useApiMutation } from "@/lib/hooks/use-api-query"
import { getRequest, postRequest, patchRequest, deleteRequest } from "@/lib/api/helpers"
import { Key, Copy, RefreshCw, Trash2, Eye, EyeOff, AlertTriangle } from "lucide-react"
import toast from "react-hot-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loading } from "@/components/ui/loading"

interface ApiKeyManagerProps {
  onApiKeyChange?: (apiKey: string | null) => void
}

export function ApiKeyManager({ onApiKeyChange }: ApiKeyManagerProps) {
  const [showApiKey, setShowApiKey] = useState(false)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [showRegenerateWarning, setShowRegenerateWarning] = useState(false)

  // Fetch API key info
  const { data: apiKeyData, isLoading, refetch } = useApiQuery(
    ['api-key'],
    getRequest('settings/api-key')
  )

  const apiKeyExists = apiKeyData?.data?.exists === true
  const lastUsedAt = apiKeyData?.data?.lastUsedAt
  const createdAt = apiKeyData?.data?.createdAt

  // Create API key mutation
  const createMutation = useApiMutation(
    postRequest('settings/api-key'),
    {
      onSuccess: (data) => {
        if (data.data?.apiKey) {
          setNewApiKey(data.data.apiKey)
          setShowApiKey(true)
          onApiKeyChange?.(data.data.apiKey)
          // Save to localStorage for testing
          if (typeof window !== 'undefined') {
            localStorage.setItem('api_key', data.data.apiKey)
          }
        }
        refetch()
      },
      successMessage: "تم إنشاء API key بنجاح",
      invalidateQueries: [['api-key']],
    }
  )

  // Regenerate API key mutation
  const regenerateMutation = useApiMutation(
    patchRequest('settings/api-key'),
    {
      onSuccess: (data) => {
        if (data.data?.apiKey) {
          setNewApiKey(data.data.apiKey)
          setShowApiKey(true)
          setShowRegenerateWarning(false)
          onApiKeyChange?.(data.data.apiKey)
          // Save to localStorage for testing
          if (typeof window !== 'undefined') {
            localStorage.setItem('api_key', data.data.apiKey)
          }
        }
        refetch()
      },
      successMessage: "تم تجديد API key بنجاح",
      invalidateQueries: [['api-key']],
    }
  )

  // Delete API key mutation
  const deleteMutation = useApiMutation(
    deleteRequest('settings/api-key'),
    {
      onSuccess: () => {
        setNewApiKey(null)
        setShowApiKey(false)
        onApiKeyChange?.(null)
        // Remove from localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('api_key')
        }
        refetch()
      },
      successMessage: "تم حذف API key بنجاح",
      invalidateQueries: [['api-key']],
    }
  )

  const handleCopyApiKey = () => {
    if (newApiKey) {
      navigator.clipboard.writeText(newApiKey)
      toast.success("تم نسخ API key")
    }
  }

  const handleRegenerate = () => {
    if (showRegenerateWarning) {
      regenerateMutation.mutate()
    } else {
      setShowRegenerateWarning(true)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "لم يتم الاستخدام"
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  return (
    <div className="space-y-6">
      <Card className="text-right">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            إدارة API Key
          </CardTitle>
          <CardDescription>
            قم بإنشاء API key لإرسال الرسائل من أنظمة خارجية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <Loading />
          ) : !apiKeyExists ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                لا يوجد API key. قم بإنشاء واحد للبدء.
              </p>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="w-full sm:w-auto"
              >
                {createMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 ml-2" />
                    إنشاء API Key
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Show new API key if just created/regenerated */}
              {newApiKey && showApiKey && (
                <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <AlertDescription className="space-y-3">
                    <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                      احفظ هذا API key الآن - لن يتم عرضه مرة أخرى!
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        value={newApiKey}
                        readOnly
                        className="font-mono text-sm"
                        dir="ltr"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyApiKey}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* API Key Info */}
              <div className="space-y-2">
                <Label>معلومات API Key</Label>
                <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">تاريخ الإنشاء:</span>
                    <span className="text-sm font-medium">
                      {createdAt ? formatDate(createdAt) : "غير متاح"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">آخر استخدام:</span>
                    <span className="text-sm font-medium">
                      {formatDate(lastUsedAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                {showRegenerateWarning ? (
                  <div className="flex-1 space-y-2">
                    <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-900/20">
                      <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <AlertDescription>
                        <p className="text-sm text-orange-800 dark:text-orange-200">
                          سيتم حذف API key القديم وإنشاء واحد جديد. لن يعمل API key القديم بعد التجديد.
                        </p>
                      </AlertDescription>
                    </Alert>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        onClick={handleRegenerate}
                        disabled={regenerateMutation.isPending}
                        className="flex-1"
                      >
                        {regenerateMutation.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                            جاري التجديد...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 ml-2" />
                            تأكيد التجديد
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowRegenerateWarning(false)}
                        disabled={regenerateMutation.isPending}
                      >
                        إلغاء
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleRegenerate}
                      disabled={regenerateMutation.isPending || deleteMutation.isPending}
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 ml-2" />
                      تجديد API Key
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => deleteMutation.mutate()}
                      disabled={regenerateMutation.isPending || deleteMutation.isPending}
                      className="flex-1"
                    >
                      {deleteMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                          جاري الحذف...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 ml-2" />
                          حذف API Key
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

