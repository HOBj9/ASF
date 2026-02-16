"use client"

import { useSession } from "next-auth/react"
import { useMemo, useEffect, useState } from "react"
import Link from "next/link"
import { apiClient } from "@/lib/api/client"
import { hasPermission, isAdmin, isOrganizationAdmin } from "@/lib/permissions"
import { permissionResources, permissionActions } from "@/constants/permissions"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ClipboardList, Plus, Edit, FileQuestion } from "lucide-react"

type Survey = {
  _id: string
  title: string
  titleAr?: string
  description?: string
  isActive: boolean
  questions: { type: string; questionText: string; options?: string[] }[]
}

type Organization = { _id: string; name: string }

export function SurveysListManager() {
  const { data: session } = useSession()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState("")
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(false)

  const userIsAdmin = useMemo(() => isAdmin(session?.user?.role as any), [session?.user?.role])
  const userIsOrgAdmin = useMemo(() => isOrganizationAdmin(session?.user?.role as any), [session?.user?.role])
  const canManage = useMemo(
    () =>
      userIsAdmin ||
      (userIsOrgAdmin && hasPermission(session?.user?.role as any, permissionResources.FORMS, permissionActions.CREATE)),
    [userIsAdmin, userIsOrgAdmin, session?.user?.role]
  )
  const orgId = useMemo(() => {
    if (selectedOrgId) return selectedOrgId
    return (session?.user as any)?.organizationId || ""
  }, [selectedOrgId, session?.user])

  const loadOrganizations = async () => {
    try {
      const res: any = await apiClient.get("/organizations").catch(() => ({ organizations: [] }))
      const list = res.organizations || res.data?.organizations || []
      setOrganizations(list)
      if (list.length === 1 && !selectedOrgId) setSelectedOrgId(list[0]._id)
      return list
    } catch {
      return []
    }
  }

  const loadSurveys = async (organizationId: string, activeOnly = false) => {
    if (!organizationId) {
      setSurveys([])
      return
    }
    setLoading(true)
    try {
      const url = `organizations/${organizationId}/surveys${activeOnly ? "?activeOnly=true" : ""}`
      const res: any = await apiClient.get(url)
      setSurveys(res.surveys || res.data?.surveys || [])
    } catch (e: any) {
      toast.error(e?.message || "فشل تحميل الاستبيانات")
      setSurveys([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!session) return
    if (userIsAdmin) loadOrganizations()
    else if (orgId) loadSurveys(orgId, !canManage)
  }, [session?.user, userIsAdmin, orgId, canManage])

  useEffect(() => {
    if (orgId && userIsAdmin) loadSurveys(orgId, !canManage)
  }, [orgId, userIsAdmin, canManage])

  return (
    <div className="space-y-6">
      {userIsAdmin && organizations.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">المؤسسة</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedOrgId || orgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="اختر المؤسسة" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((o) => (
                  <SelectItem key={o._id} value={o._id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {orgId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {canManage ? "قائمة الاستبيانات" : "استبيانات جاهزة للإجابة"}
            </CardTitle>
            {canManage && (
              <Button asChild>
                <Link href="/dashboard/surveys/new">
                  <Plus className="h-4 w-4 ml-2" />
                  إنشاء استبيان
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">جاري التحميل...</p>
            ) : surveys.length === 0 ? (
              <p className="text-muted-foreground">
                {canManage ? "لا توجد استبيانات. أنشئ استبياناً جديداً." : "لا توجد استبيانات نشطة للإجابة."}
              </p>
            ) : (
              <ul className="space-y-3">
                {surveys.map((s) => (
                  <li
                    key={s._id}
                    className="flex items-center justify-between gap-4 rounded-lg border p-4"
                  >
                    <div>
                      <h3 className="font-medium">{s.titleAr || s.title}</h3>
                      {s.description && (
                        <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {s.questions?.length ?? 0} سؤال • {s.isActive ? "نشط" : "غير نشط"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {canManage ? (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/surveys/${s._id}/edit`}>
                            <Edit className="h-4 w-4 ml-2" />
                            تعديل
                          </Link>
                        </Button>
                      ) : (
                        s.isActive && (
                          <Button size="sm" asChild>
                            <Link href={`/dashboard/surveys/${s._id}/answer`}>
                              <FileQuestion className="h-4 w-4 ml-2" />
                              فتح / الإجابة
                            </Link>
                          </Button>
                        )
                      )}
                      {canManage && s.isActive && (
                        <Button size="sm" asChild>
                          <Link href={`/dashboard/surveys/${s._id}/answer`}>
                            <FileQuestion className="h-4 w-4 ml-2" />
                            معاينة
                          </Link>
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {!orgId && session && !loading && (
        <p className="text-muted-foreground">لا توجد مؤسسة محددة.</p>
      )}
    </div>
  )
}
