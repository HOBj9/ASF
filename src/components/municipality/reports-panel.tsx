"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ReportsPanel() {
  return (
    <Card className="text-right">
      <CardHeader>
        <CardTitle>التقارير</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <a className="inline-flex items-center rounded-lg border px-4 py-2 text-sm hover:bg-muted" href="/api/reports/vehicles">
            تحميل تقرير الشاحنات والمركبات (اليوم)
          </a>
          <a className="inline-flex items-center rounded-lg border px-4 py-2 text-sm hover:bg-muted" href="/api/reports/points">
            تحميل تقرير الحاويات (اليوم)
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
