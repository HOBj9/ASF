"use client"

export function UserDashboard() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-gradient-to-br from-background to-purple/5 dark:to-purple/10 p-8 shadow-lg backdrop-blur-sm text-right">
        <h2 className="text-2xl font-semibold mb-4 text-foreground">مرحباً بك في لوحة التحكم</h2>
        <p className="text-muted-foreground">
          يمكنك استخدام القائمة الجانبية للتنقل بين الصفحات المتاحة لك.
        </p>
      </div>
    </div>
  )
}
