"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { useMemo } from "react"
import {
  LayoutDashboard,
  UserCog,
  KeyRound,
  Settings,
  Building2,
  Building,
  Truck,
  Users,
  MapPin,
  Route,
  FileText,
  Boxes,
  ClipboardList,
  MapPinned,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { hasAnyPermission, isAdmin } from "@/lib/permissions"
import { permissionActions, permissionResources } from "@/constants/permissions"
import { useLabels } from "@/hooks/use-labels"
import { Skeleton } from "@/components/ui/skeleton"

interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  adminOnly?: boolean
  superAdminOnly?: boolean
  permissions?: Array<{ resource: string; action: string }>
}

function useDashboardNavItems() {
  const pathname = usePathname()
  const { data: session, status: sessionStatus } = useSession()
  const { labels, loading: labelsLoading } = useLabels()

  const menuItems = useMemo<NavItem[]>(() => ([
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
      title: "نقاط المؤسسة",
      href: "/dashboard/organization-points",
      icon: MapPinned,
      permissions: [{ resource: permissionResources.POINTS, action: permissionActions.READ }],
    },
    {
      title: "الاستبيانات",
      href: "/dashboard/surveys",
      icon: ClipboardList,
      permissions: [{ resource: permissionResources.FORMS, action: permissionActions.READ }],
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
    {
      title: "المواد",
      href: "/dashboard/materials",
      icon: Boxes,
      permissions: [{ resource: permissionResources.MATERIALS, action: permissionActions.READ }],
    },
  ]), [labels.branchLabel, labels.driverLabel, labels.pointLabel, labels.routeLabel, labels.vehicleLabel])

  const userIsAdmin = useMemo(() => {
    const role = session?.user?.role as any
    if (!role) return false
    if (typeof role === "string") return role === "super_admin"
    return isAdmin(role)
  }, [session?.user?.role])

  const userIsSuperAdmin = useMemo(() => {
    const role = session?.user?.role as any
    if (!role) return false
    if (typeof role === "string") return role === "super_admin"
    return role?.name === "super_admin"
  }, [session?.user?.role])

  const filteredMenuItems = useMemo(() => (
    menuItems.filter((item) => {
      if (item.adminOnly && !userIsAdmin) return false
      if (item.superAdminOnly && !userIsSuperAdmin) return false
      if (userIsAdmin) return true
      if (item.permissions && item.permissions.length > 0) {
        const role = session?.user?.role || null
        return hasAnyPermission(role as any, item.permissions)
      }
      return true
    })
  ), [menuItems, session?.user?.role, userIsAdmin, userIsSuperAdmin])

  const isLoading = sessionStatus === "loading" || labelsLoading

  return {
    items: filteredMenuItems,
    isLoading,
    pathname,
  }
}

export function DashboardNavIcons() {
  const { items, isLoading, pathname } = useDashboardNavItems()

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        {Array.from({ length: 8 }).map((_, idx) => (
          <Skeleton key={`dashboard-nav-skeleton-${idx}`} className="h-9 w-9 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <nav className="flex w-full items-center justify-between gap-1 py-1">
      {items.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.title}
            aria-current={isActive ? "page" : undefined}
            title={item.title}
            className={cn(
              "group relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 xl:h-10 xl:w-10",
              isActive
                ? "bg-gradient-to-l from-[hsl(var(--sidebar-item-active-bg))] via-[hsl(var(--sidebar-item-active-bg))]/90 to-[hsl(var(--sidebar-item-active-bg))]/80 text-[hsl(var(--sidebar-item-active-text))] shadow-md shadow-[hsl(var(--sidebar-item-active-bg))]/30"
                : "text-foreground/70 hover:bg-[hsl(var(--sidebar-item-hover))] hover:text-foreground"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5 transition-transform duration-200",
                isActive ? "text-[hsl(var(--sidebar-item-active-text))]" : "group-hover:scale-110 group-hover:text-[hsl(var(--icon-hover))]"
              )}
            />
            <span className="sr-only">{item.title}</span>
            <span
              className={cn(
                "pointer-events-none absolute top-full z-50 mt-2 whitespace-nowrap rounded-md border border-border/70 bg-popover px-2 py-1 text-xs text-foreground shadow-lg",
                "opacity-0 translate-y-1 transition-all duration-200",
                "group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0"
              )}
            >
              {item.title}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

export function DashboardNavMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { items, isLoading, pathname } = useDashboardNavItems()

  if (isLoading) {
    return (
      <div className="w-56 space-y-2 p-2">
        {Array.from({ length: 6 }).map((_, idx) => (
          <Skeleton key={`dashboard-nav-menu-skeleton-${idx}`} className="h-9 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="w-56 rounded-xl border border-border/70 bg-popover p-2 shadow-lg">
      {items.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-[hsl(var(--sidebar-item-active-bg))]/15 text-[hsl(var(--sidebar-item-active-text))]"
                : "text-foreground/80 hover:bg-[hsl(var(--sidebar-item-hover))] hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="truncate">{item.title}</span>
          </Link>
        )
      })}
    </div>
  )
}
