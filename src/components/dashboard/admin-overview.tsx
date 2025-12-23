"use client"

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

interface AdminOverviewProps {
  initialUsers?: User[]
}

export function AdminOverview({ initialUsers = [] }: AdminOverviewProps) {
  const userStats = {
    total: initialUsers.length,
    active: initialUsers.filter((u) => u.isActive).length,
    inactive: initialUsers.filter((u) => !u.isActive).length,
  }

  return (
    <div className="space-y-6">
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
    </div>
  )
}
