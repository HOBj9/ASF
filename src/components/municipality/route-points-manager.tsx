"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import toast from "react-hot-toast"
import { useLabels } from "@/hooks/use-labels"

type Point = { _id: string; name: string; nameAr?: string }
type RoutePoint = { pointId: string; order: number }

export function RoutePointsManager({ routeId }: { routeId: string }) {
  const [points, setPoints] = useState<Point[]>([])
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([])
  const [loading, setLoading] = useState(false)
  const { labels } = useLabels()

  const load = async () => {
    setLoading(true)
    try {
      const [pointsRes, routePointsRes] = await Promise.all([
        apiClient.get("/points"),
        apiClient.get(`/routes/${routeId}/points`),
      ])
      setPoints(pointsRes.points || pointsRes.data?.points || [])
      setRoutePoints(routePointsRes.routePoints || routePointsRes.data?.routePoints || [])
    } catch (error: any) {
      toast.error(error.message || `فشل تحميل بيانات ${labels.routeLabel}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [routeId])

  const togglePoint = (pointId: string) => {
    const exists = routePoints.find((p) => p.pointId === pointId)
    if (exists) {
      setRoutePoints((prev) => prev.filter((p) => p.pointId !== pointId))
    } else {
      setRoutePoints((prev) => [...prev, { pointId, order: prev.length }])
    }
  }

  const updateOrder = (pointId: string, value: number) => {
    setRoutePoints((prev) =>
      prev.map((p) => (p.pointId === pointId ? { ...p, order: value } : p))
    )
  }

  const save = async () => {
    if (routePoints.length === 0) {
      toast.error(`اختر ${labels.pointLabel} أولاً`)
      return
    }
    try {
      await apiClient.post(`/routes/${routeId}/points`, { points: routePoints })
      toast.success(`تم حفظ ${labels.pointLabel}`)
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ")
    }
  }

  return (
    <Card className="text-right">
      <CardHeader>
        <CardTitle>{labels.pointLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">جاري التحميل...</div>
        ) : (
          <>
            <div className="space-y-2">
              {points.map((point) => {
                const selected = routePoints.find((p) => p.pointId === point._id)
                return (
                  <div key={point._id} className="flex items-center justify-between border rounded-lg p-2">
                    <div>
                      <div className="font-medium">{point.nameAr || point.name}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selected && (
                        <Input
                          className="w-20 text-center"
                          type="number"
                          value={selected.order}
                          onChange={(e) => updateOrder(point._id, Number(e.target.value))}
                        />
                      )}
                      <Button variant={selected ? "destructive" : "outline"} onClick={() => togglePoint(point._id)}>
                        {selected ? "إزالة" : "إضافة"}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4">
              <Button onClick={save}>حفظ ترتيب {labels.pointLabel}</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

