"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard,
  X,
  UserCog,
  KeyRound,
  User,
  Settings,
  Building2,
  Building,
  Truck,
  Users,
  MapPin,
  Route,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import { cn } from "@/lib/utils"
import { useSidebarStore } from "@/store/sidebar-store"
import { useEffect, useState, useMemo } from "react"
import { hasAnyPermission, isAdmin } from "@/lib/permissions"
import { permissionActions, permissionResources } from "@/constants/permissions"
import { useLabels } from "@/hooks/use-labels"

interface SidebarProps {
  isAdmin: boolean
  user: {
    name: string
    email: string
    avatar?: string | null
    roleName?: string | null
  }
}

export function Sidebar({ isAdmin: initialIsAdmin, user: initialUser }: SidebarProps) {
  const pathname = usePathname()
  const { isOpen, toggle, close } = useSidebarStore()
  const { data: session } = useSession()
  const [roleName, setRoleName] = useState<string | null>(initialUser.roleName || null)
  const { labels } = useLabels()

  // Get user data from session (updated when impersonation changes)
  const currentUser = useMemo(() => {
    if (session?.user) {
      return {
        name: session.user.name || initialUser.name,
        email: session.user.email || initialUser.email,
        avatar: session.user.avatar || initialUser.avatar,
      }
    }
    return initialUser
  }, [session?.user, initialUser])

  // Check if user is admin from session
  const userIsAdmin = useMemo(() => {
    if (session?.user?.role) {
      return isAdmin(session.user.role as any)
    }
    return initialIsAdmin
  }, [session?.user?.role, initialIsAdmin])

  const userIsSuperAdmin = useMemo(() => {
    const role = session?.user?.role as any
    if (!role) return false
    if (typeof role === "string") return role === "super_admin"
    return role?.name === "super_admin"
  }, [session?.user?.role])

  // Fetch role name when role changes
  useEffect(() => {
    const fetchRoleName = async () => {
      if (session?.user?.role) {
        try {
          // Check if role object has nameAr directly
          const role = session.user.role as any
          if (role?.nameAr) {
            setRoleName(role.nameAr)
            return
          }

          // Otherwise, fetch from API
          const roleId = typeof role === 'object' && 'id' in role 
            ? role.id 
            : typeof role === 'object' && '_id' in role
            ? role._id
            : role

          if (roleId) {
            const data = await apiClient.get(`/roles/${roleId}/name`)
            if (data.data?.nameAr) {
              setRoleName(data.data.nameAr)
            }
          }
        } catch (error) {
          console.error('Failed to fetch role name:', error)
          // Fallback to initial value
          if (initialUser.roleName) {
            setRoleName(initialUser.roleName)
          }
        }
      } else if (initialUser.roleName) {
        setRoleName(initialUser.roleName)
      }
    }

    fetchRoleName()
  }, [session?.user?.role, initialUser.roleName])

  const menuItems = useMemo(() => ([
    {
      title: "لوحة التحكم",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "المؤسسات",
      href: "/dashboard/admin/organizations",
      icon: Building,
      superAdminOnly: true,
    },
    {
      title: labels.branchLabel || "الفروع",
      href: "/dashboard/admin/municipalities",
      icon: Building2,
      permissions: [{ resource: permissionResources.BRANCHES, action: permissionActions.READ }],
    },
    {
      title: labels.vehicleLabel || "المركبات",
      href: "/dashboard/vehicles",
      icon: Truck,
      permissions: [{ resource: permissionResources.VEHICLES, action: permissionActions.READ }],
    },
    {
      title: labels.driverLabel || "السائقون",
      href: "/dashboard/drivers",
      icon: Users,
      permissions: [{ resource: permissionResources.DRIVERS, action: permissionActions.READ }],
    },
    {
      title: labels.pointLabel || "النقاط",
      href: "/dashboard/points",
      icon: MapPin,
      permissions: [{ resource: permissionResources.POINTS, action: permissionActions.READ }],
    },
    {
      title: labels.routeLabel || "المسارات",
      href: "/dashboard/routes",
      icon: Route,
      permissions: [{ resource: permissionResources.ROUTES, action: permissionActions.READ }],
    },
    {
      title: "التقارير",
      href: "/dashboard/reports",
      icon: FileText,
      permissions: [{ resource: permissionResources.REPORTS, action: permissionActions.READ }],
    },
    {
      title: "المستخدمون",
      href: "/dashboard/admin/users",
      icon: UserCog,
      adminOnly: true,
    },
    {
      title: "إدارة الأدوار",
      href: "/dashboard/admin/roles",
      icon: KeyRound,
      adminOnly: true,
    },
    {
      title: "الإعدادات",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ]), [labels.branchLabel, labels.driverLabel, labels.pointLabel, labels.routeLabel, labels.vehicleLabel])

  const filteredMenuItems = menuItems.filter(
    (item) => {
      // Show admin-only items only for admin
      if (item.adminOnly && !userIsAdmin) return false
      if ((item as any).superAdminOnly && !userIsSuperAdmin) return false
      if (userIsAdmin) return true
      if (item.permissions && item.permissions.length > 0) {
        const role = session?.user?.role || null
        return hasAnyPermission(role as any, item.permissions)
      }
      return true
    }
  )

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        useSidebarStore.getState().open()
      }
    }

    // Set initial state on mount
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      useSidebarStore.getState().open()
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={close}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 right-0 z-50 flex h-screen w-72 flex-col transition-transform duration-300 ease-in-out",
          "lg:m-4 lg:rounded-2xl lg:h-[calc(100vh-2rem)]",
          "bg-gradient-to-br from-background via-background/95 to-background/90",
          "backdrop-blur-xl bg-opacity-80 dark:bg-opacity-90",
          "border-l lg:border lg:rounded-2xl border-border/50",
          "shadow-2xl shadow-black/10 dark:shadow-black/40",
          "lg:shadow-[0_8px_32px_0_rgba(0,0,0,0.12)] dark:lg:shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]",
          isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="border-b border-border/50 bg-gradient-to-l from-[hsl(var(--primary))]/20 via-[hsl(var(--primary))]/10 to-transparent dark:from-[hsl(var(--primary))]/30 dark:via-[hsl(var(--primary))]/15 backdrop-blur-sm lg:rounded-t-2xl">
          {/* Close Button */}
          <div className="flex h-12 items-center justify-end px-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="lg:hidden hover:bg-[hsl(var(--sidebar-item-hover))] rounded-lg"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* User Profile Section */}
          <div className="px-6 pt-2 pb-2">
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-[hsl(var(--sidebar-item-hover))] transition-all duration-200 text-right group"
            >
              <div className="relative">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="h-12 w-12 rounded-full object-cover border-2 border-[hsl(var(--primary))]/30 dark:border-[hsl(var(--primary))]/40 group-hover:border-[hsl(var(--primary))]/50 transition-all"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary-light))] flex items-center justify-center border-2 border-[hsl(var(--primary))]/30 dark:border-[hsl(var(--primary))]/40 group-hover:border-[hsl(var(--primary))]/50 transition-all">
                    <User className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
  <p className="text-sm font-semibold text-foreground truncate">
    مرحبًا، {currentUser.name}
  </p>
</div>
            </Link>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 space-y-2 p-4 overflow-y-auto">
          {filteredMenuItems.map((item, index) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 text-right",
                  "group relative overflow-hidden",
                  "animate-fade-in",
                  isActive
                    ? "bg-gradient-to-l from-[hsl(var(--sidebar-item-active-bg))] via-[hsl(var(--sidebar-item-active-bg))]/90 to-[hsl(var(--sidebar-item-active-bg))]/80 text-[hsl(var(--sidebar-item-active-text))] shadow-lg shadow-[hsl(var(--sidebar-item-active-bg))]/40"
                    : "text-foreground/70 hover:bg-[hsl(var(--sidebar-item-hover))] hover:text-foreground hover:shadow-md"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={cn(
                  "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                  "bg-gradient-to-l from-[hsl(var(--primary))]/20 to-transparent"
                )} />
                <Icon className={cn(
                  "h-5 w-5 relative z-10 transition-transform duration-200",
                  isActive ? "text-[hsl(var(--sidebar-item-active-text))]" : "text-foreground/70 group-hover:scale-110 group-hover:text-[hsl(var(--icon-hover))]"
                )} />
                <span className="relative z-10">{item.title}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}








