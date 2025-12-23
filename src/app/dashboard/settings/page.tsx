"use client"

import { useState } from "react"
import { ApiKeyManager } from "@/components/settings/api-key-manager"
import { ApiUsageExamples } from "@/components/settings/api-usage-examples"
import { ApiKeyTester } from "@/components/settings/api-key-tester"

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState<string | null>(null)

  return (
    <div className="text-right space-y-6">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold">إعدادات API Key</h1>
        <p className="text-muted-foreground mt-2">إدارة API key الخاص بك واستخدامه في أنظمتك الخارجية</p>
      </div>

      <ApiKeyManager onApiKeyChange={setApiKey} />
      <ApiKeyTester apiKey={apiKey} />
      <ApiUsageExamples />
    </div>
  )
}

