"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Text } from "@/components/ui/text"

interface Submission {
  _id: string
  name: string
  email: string
  subject?: string
  message: string
  createdAt: string
}

export function ContactSubmissionsTable({ initialSubmissions }: { initialSubmissions: Submission[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>قائمة الرسائل ({initialSubmissions.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {initialSubmissions.length === 0 ? (
          <Text className="text-muted-foreground">لا توجد رسائل</Text>
        ) : (
          <ul className="space-y-2">
            {initialSubmissions.map((s) => (
              <li key={s._id} className="border rounded p-3 text-right">
                <div><strong>{s.name}</strong> — {s.email}</div>
                {s.subject && <div className="text-sm text-muted-foreground">{s.subject}</div>}
                <div className="mt-1">{s.message}</div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
