"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getNotificationPreferences,
  setNotificationPreferences,
  getDefaultNotificationPreferences,
  type NotificationPreferences,
  type ToastPosition,
} from "@/lib/utils/notification-preferences"

const POSITION_OPTIONS: { value: ToastPosition; label: string }[] = [
  { value: "top-right", label: "أعلى اليمين" },
  { value: "top-center", label: "أعلى الوسط" },
  { value: "top-left", label: "أعلى اليسار" },
  { value: "bottom-right", label: "أسفل اليمين" },
  { value: "bottom-center", label: "أسفل الوسط" },
  { value: "bottom-left", label: "أسفل اليسار" },
]

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(getDefaultNotificationPreferences())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setPrefs(getNotificationPreferences())
    setMounted(true)
  }, [])

  const update = (partial: Partial<NotificationPreferences>) => {
    const next = { ...prefs, ...partial }
    setPrefs(next)
    setNotificationPreferences(next)
  }

  if (!mounted) {
    return (
      <Card className="text-right">
        <CardHeader>
          <CardTitle>تخصيص الإشعارات</CardTitle>
          <CardDescription>جاري التحميل...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="text-right">
      <CardHeader>
        <CardTitle>تخصيص الإشعارات</CardTitle>
        <CardDescription>
          التحكم في إشعارات أحداث الدخول والخروج من النقاط (التتبع الحي)، والنغمة وطريقة ظهور الإشعار.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-row-reverse items-center justify-between gap-4">
          <Label htmlFor="notif-enabled" className="cursor-pointer flex-1 text-right">
            تفعيل إشعارات الأحداث
          </Label>
          <Switch
            id="notif-enabled"
            checked={prefs.enabled}
            onCheckedChange={(checked) => update({ enabled: checked })}
          />
        </div>
        <div className="flex flex-row-reverse items-center justify-between gap-4">
          <Label htmlFor="notif-sound" className="cursor-pointer flex-1 text-right">
            تشغيل نغمة عند ظهور الإشعار
          </Label>
          <Switch
            id="notif-sound"
            checked={prefs.soundEnabled}
            onCheckedChange={(checked) => update({ soundEnabled: checked })}
            disabled={!prefs.enabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notif-position">موضع ظهور الإشعار</Label>
          <Select
            value={prefs.toastPosition}
            onValueChange={(value) => update({ toastPosition: value as ToastPosition })}
            disabled={!prefs.enabled}
          >
            <SelectTrigger id="notif-position" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSITION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notif-duration">مدة ظهور الإشعار (ثانية)</Label>
          <Input
            id="notif-duration"
            type="number"
            min={2}
            max={60}
            step={0.5}
            value={prefs.toastDurationSeconds}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              if (!Number.isNaN(v)) update({ toastDurationSeconds: Math.min(60, Math.max(2, v)) })
            }}
            disabled={!prefs.enabled}
            className="w-full max-w-[8rem]"
          />
        </div>
      </CardContent>
    </Card>
  )
}
