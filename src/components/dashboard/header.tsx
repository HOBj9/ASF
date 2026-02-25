"use client"

import { LogOut, AlertCircle, Home, RefreshCw, User, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSession, signOut } from "next-auth/react"
import { apiClient } from "@/lib/api/client"
import { useCallback, useState, useEffect } from "react"
import toast from "react-hot-toast"
import { Loading } from "@/components/ui/loading"
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link"
import { useSidebarStore } from "@/store/sidebar-store"

export function DashboardHeader() {
  const { data: session, update } = useSession()
  const [returningToAdmin, setReturningToAdmin] = useState(false)
  const toggleSidebar = useSidebarStore((s) => s.toggle)

  const handleStopImpersonate = useCallback(async () => {
    setReturningToAdmin(true)
    try {
      const data = await apiClient.delete('/admin/impersonate')

      if (!data.data) {
        throw new Error(data.error || 'حدث خطأ')
      }

      // Update session to return to admin account
      // Clear impersonation info by passing null
      await update({
        ...data.data.user,
        originalAdminId: null,
        originalAdminName: null,
        originalAdminEmail: null,
      } as any)

      toast.success('تم العودة إلى حساب المدير')
      
      // Wait for session to update, then force full page reload to ensure fresh data
      setTimeout(() => {
        setReturningToAdmin(false)
        window.location.href = '/dashboard'
      }, 300)
    } catch (error: any) {
      console.error('Error stopping impersonation:', error)
      toast.error(error.message || 'حدث خطأ')
      setReturningToAdmin(false)
    }
  }, [update])

  const isImpersonating = session?.user && 'originalAdminId' in session.user

  // Stop loader when impersonation ends
  useEffect(() => {
    if (!isImpersonating && returningToAdmin) {
      // Give a small delay to ensure navigation completes
      const timer = setTimeout(() => {
        setReturningToAdmin(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isImpersonating, returningToAdmin])

  return (
    <>
      {returningToAdmin && (
        <Loading 
          fullScreen 
          text="جاري العودة إلى حساب المدير... يرجى الانتظار" 
        />
      )}
      <header className="flex h-16 shrink-0 items-center border-b bg-background px-4 lg:px-6 flex-row-reverse gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="flex items-center gap-2"
            title="العودة إلى الصفحة الرئيسية"
          >
            <Link href="/">
              <Home className="h-5 w-5" />
              <span className="sr-only">العودة إلى الصفحة الرئيسية</span>
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            asChild
            title="الملف الشخصي"
          >
            <Link href="/dashboard/profile">
              <User className="h-5 w-5" />
              <span className="sr-only">الملف الشخصي</span>
            </Link>
          </Button>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: typeof window !== "undefined" ? `${window.location.origin}/login` : "/login" })}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">تسجيل الخروج</span>
          </Button>
        </div>
        <div className="flex-1 flex justify-end lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => toggleSidebar()}
            title="القائمة"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        {isImpersonating && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[hsl(var(--warning-bg))] text-[hsl(var(--warning))] border border-[hsl(var(--warning-border))]">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                تعمل كـ: {session.user.name}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStopImpersonate}
              disabled={returningToAdmin}
              className="flex items-center gap-2"
            >
              {returningToAdmin ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  جاري العودة...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  العودة للمدير
                </>
              )}
            </Button>
          </div>
        )}
      </header>
    </>
  )
}
