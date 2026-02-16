"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import toast from "react-hot-toast"
import { Loading } from "@/components/ui/loading"

type OrganizationLabels = {
  branchLabel: string
  pointLabel: string
  vehicleLabel: string
  driverLabel: string
  routeLabel: string
  lineSupervisorLabel: string
  surveyLabel: string
}

const defaultLabels: OrganizationLabels = {
  branchLabel: "فرع",
  pointLabel: "نقطة",
  vehicleLabel: "مركبة",
  driverLabel: "سائق",
  routeLabel: "مسار",
  lineSupervisorLabel: "مشرفو الخط",
  surveyLabel: "الاستبيانات",
}

export function OrganizationLabelsSettings() {
  const [labels, setLabels] = useState<OrganizationLabels>(defaultLabels)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [available, setAvailable] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await apiClient.get("/organization")
        const organization = data.organization || data.data?.organization
        if (!organization) {
          setAvailable(false)
          return
        }

        setLabels({
          branchLabel: organization.labels?.branchLabel || defaultLabels.branchLabel,
          pointLabel: organization.labels?.pointLabel || defaultLabels.pointLabel,
          vehicleLabel: organization.labels?.vehicleLabel || defaultLabels.vehicleLabel,
          driverLabel: organization.labels?.driverLabel || defaultLabels.driverLabel,
          routeLabel: organization.labels?.routeLabel || defaultLabels.routeLabel,
          lineSupervisorLabel: organization.labels?.lineSupervisorLabel || defaultLabels.lineSupervisorLabel,
          surveyLabel: organization.labels?.surveyLabel || defaultLabels.surveyLabel,
        })
      } catch (error: any) {
        setAvailable(false)
        if (error?.status !== 403) {
          toast.error(error.message || "تعذر تحميل تسميات المؤسسة")
        }
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await apiClient.patch("/organization", { labels })
      toast.success("تم حفظ تسميات المؤسسة")
    } catch (error: any) {
      toast.error(error.message || "تعذر حفظ التسميات")
    } finally {
      setSaving(false)
    }
  }

  if (!available) {
    return (
      <Card className="text-right">
        <CardHeader>
          <CardTitle>تسميات المؤسسة</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            لا تملك صلاحية تعديل تسميات المؤسسة أو لا توجد مؤسسة مرتبطة بهذا الحساب.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="text-right">
      <CardHeader>
        <CardTitle>تخصيص المسميات</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Loading text="جاري تحميل التسميات..." />
        ) : (
          <>
            <div>
              <Label>تسمية الفروع</Label>
              <Input
                value={labels.branchLabel}
                onChange={(e) => setLabels((prev) => ({ ...prev, branchLabel: e.target.value }))}
              />
            </div>
            <div>
              <Label>تسمية النقاط</Label>
              <Input
                value={labels.pointLabel}
                onChange={(e) => setLabels((prev) => ({ ...prev, pointLabel: e.target.value }))}
              />
            </div>
            <div>
              <Label>تسمية المركبات</Label>
              <Input
                value={labels.vehicleLabel}
                onChange={(e) => setLabels((prev) => ({ ...prev, vehicleLabel: e.target.value }))}
              />
            </div>
            <div>
              <Label>تسمية السائقين</Label>
              <Input
                value={labels.driverLabel}
                onChange={(e) => setLabels((prev) => ({ ...prev, driverLabel: e.target.value }))}
              />
            </div>
            <div>
              <Label>تسمية المسارات</Label>
              <Input
                value={labels.routeLabel}
                onChange={(e) => setLabels((prev) => ({ ...prev, routeLabel: e.target.value }))}
              />
            </div>
            <div>
              <Label>تسمية مشرفي الخط</Label>
              <Input
                value={labels.lineSupervisorLabel}
                onChange={(e) => setLabels((prev) => ({ ...prev, lineSupervisorLabel: e.target.value }))}
              />
            </div>
            <div>
              <Label>تسمية الاستبيانات</Label>
              <Input
                value={labels.surveyLabel}
                onChange={(e) => setLabels((prev) => ({ ...prev, surveyLabel: e.target.value }))}
              />
            </div>
            <div className="pt-2">
              <Button onClick={save} disabled={saving}>
                {saving ? "جاري الحفظ..." : "حفظ التسميات"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

