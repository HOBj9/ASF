"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RolesManagement } from "@/components/admin/roles-management"
import { UsersTable } from "@/components/admin/users-table"
import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { LoadingCard } from "@/components/ui/loading"
import { StatsCards } from "./stats-cards"
import { DailyConsumptionChart } from "./daily-consumption-chart"
import toast from "react-hot-toast"
import { apiClient } from "@/lib/api/client"

interface User {
  _id: string
  name: string
  email: string
  role: {
    _id: string
    name: string
    nameAr: string
  }
  isActive: boolean
  createdAt: string
}

interface AdminRole {
  _id: string
  name: string
  nameAr: string
  permissions: any[]
  createdAt: string
}

interface Permission {
  _id: string
  name: string
  nameAr: string
  resource: string
  action: string
}

interface AdminTabsProps {
  initialUsers?: User[]
  roles?: AdminRole[]
  permissions?: Permission[]
}

interface DashboardStats {
  totalMessages: number
  totalSessions: number
  totalContacts: number
  dailyConsumption: Array<{ date: string; count: number }>
}

export function AdminTabs({ initialUsers = [], roles = [], permissions = [] }: AdminTabsProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiClient.get("/admin/users")
      if (data.data) {
        setUsers(data.data.users || [])
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialUsers.length === 0) {
      fetchUsers()
    }
  }, [initialUsers.length, fetchUsers])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiClient.get("/dashboard/stats")
        if (data.data) {
          setStats(data.data.stats)
        } else {
          toast.error("فشل في تحميل الإحصائيات")
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error)
        toast.error("حدث خطأ أثناء تحميل الإحصائيات")
      } finally {
        setStatsLoading(false)
      }
    }

    fetchStats()
  }, [])

  const userStats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    inactive: users.filter((u) => !u.isActive).length,
  }), [users])

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/seed">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 ml-2" />
            إعادة تهيئة قاعدة البيانات
          </Button>
        </Link>
      </div>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex flex-row-reverse">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="users">المستخدمون</TabsTrigger>
          <TabsTrigger value="roles">الأدوار والصلاحيات</TabsTrigger>
        </TabsList>
      
      <TabsContent value="overview" className="mt-6 space-y-6">
        {/* User Statistics */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-right">إحصائيات المستخدمين</h2>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border bg-gradient-to-br from-purple/10 to-purple/5 dark:from-purple/20 dark:to-purple/10 p-6 shadow-lg backdrop-blur-sm hover:shadow-xl transition-all duration-200 animate-scale-in text-right">
              <h3 className="text-lg font-semibold mb-2 text-foreground text-right">إجمالي المستخدمين</h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 dark:from-purple-400 dark:to-purple-300 bg-clip-text text-transparent text-right">{userStats.total.toLocaleString('ar')}</p>
            </div>
            <div className="rounded-xl border bg-gradient-to-br from-green/10 to-green/5 dark:from-green/20 dark:to-green/10 p-6 shadow-lg backdrop-blur-sm hover:shadow-xl transition-all duration-200 animate-scale-in text-right" style={{ animationDelay: '100ms' }}>
              <h3 className="text-lg font-semibold mb-2 text-foreground text-right">المستخدمون النشطون</h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-400 dark:from-green-400 dark:to-green-300 bg-clip-text text-transparent text-right">
                {userStats.active.toLocaleString('ar')}
              </p>
            </div>
            <div className="rounded-xl border bg-gradient-to-br from-blue/10 to-blue/5 dark:from-blue/20 dark:to-blue/10 p-6 shadow-lg backdrop-blur-sm hover:shadow-xl transition-all duration-200 animate-scale-in text-right" style={{ animationDelay: '200ms' }}>
              <h3 className="text-lg font-semibold mb-2 text-foreground text-right">المستخدمون المعطلون</h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent text-right">
                {userStats.inactive.toLocaleString('ar')}
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Statistics */}
        {statsLoading ? (
          <LoadingCard text="جاري تحميل الإحصائيات..." />
        ) : stats ? (
          <>
            <div>
              <h2 className="text-xl font-semibold mb-4 text-right">إحصائيات النظام</h2>
              <StatsCards
                totalMessages={stats.totalMessages}
                totalSessions={stats.totalSessions}
                totalContacts={stats.totalContacts}
              />
            </div>
            <div>
              <DailyConsumptionChart data={stats.dailyConsumption} />
            </div>
          </>
        ) : null}
      </TabsContent>

      <TabsContent value="users" className="mt-6">
        {loading ? (
          <LoadingCard text="جاري تحميل المستخدمين..." />
        ) : (
          <UsersTable users={users} />
        )}
      </TabsContent>

      <TabsContent value="roles" className="mt-6">
        <RolesManagement initialRoles={roles} initialPermissions={permissions} />
      </TabsContent>
      </Tabs>
    </div>
  )
}

