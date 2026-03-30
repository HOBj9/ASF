"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard,
  Building2,
  Building,
  Truck,
  Users,
  MapPin,
  MapPinned,
  Route,
  FileText,
  Boxes,
  UserCheck,
  ClipboardList,
  Webhook,
  Activity,
  Globe,
  CalendarClock,
  Tags,
  KeyRound,
  UserCog,
  Settings,
  ChevronDown,
} from "lucide-react"
import { useMemo, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { hasAnyPermission, isAdmin, isOrganizationAdmin, isBranchAdmin, isLineSupervisor } from "@/lib/permissions"
import { permissionActions, permissionResources } from "@/constants/permissions"
import { useLabels } from "@/hooks/use-labels"
import { Skeleton } from "@/components/ui/skeleton"

interface DashboardNavProps {
  isAdmin: boolean
  user: {
    name: string
    email: string
    avatar?: string | null
    roleName?: string | null
  }
}

export function DashboardNav({ isAdmin: initialIsAdmin, user: initialUser }: DashboardNavProps) {
  const pathname = usePathname()
  const { data: session, status: sessionStatus } = useSession()
  const { labels, loading: labelsLoading } = useLabels()
  const [openGroup, setOpenGroup] = useState<string | null>(null)

  const userIsAdmin = useMemo(() => {
    if (session?.user?.role) return isAdmin(session.user.role as any)
    return initialIsAdmin
  }, [session?.user?.role, initialIsAdmin])

  const userIsSuperAdmin = useMemo(() => {
    const role = session?.user?.role as any
    if (!role) return false
    return typeof role === "string" ? role === "super_admin" : role?.name === "super_admin"
  }, [session?.user?.role])

  const userIsOrgAdmin = useMemo(() => isOrganizationAdmin(session?.user?.role as any), [session?.user?.role])
  const userIsLineSupervisor = useMemo(() => isLineSupervisor(session?.user?.role as any), [session?.user?.role])

  const menuItems = useMemo(
    () => [
      {
        group: "home" as const,
        title: "الرئيسية",
        href: "/dashboard",
        icon: LayoutDashboard,
        permissions: [{ resource: permissionResources.DASHBOARD, action: permissionActions.READ }],
        standaloneFirst: true,
      },
      {
        group: "organizations" as const,
        title: "المؤسسات",
        href: "/dashboard/admin/organizations",
        icon: Building,
        superAdminOnly: true,
      },
      {
        group: "branchOps" as const,
        title: labels.branchLabel || "الفروع",
        href: "/dashboard/admin/municipalities",
        icon: Building2,
        permissions: [{ resource: permissionResources.BRANCHES, action: permissionActions.READ }],
      },
      {
        group: "branchOps" as const,
        title: labels.lineSupervisorLabel || "مشرفو الخط",
        href: "/dashboard/line-supervisors",
        icon: UserCheck,
        organizationAdminOrSuperAdmin: true,
      },
      {
        group: "branchOps" as const,
        title: labels.vehicleLabel || "المركبات",
        href: "/dashboard/vehicles",
        icon: Truck,
        permissions: [{ resource: permissionResources.VEHICLES, action: permissionActions.READ }],
      },
      {
        group: "branchOps" as const,
        title: "مراقبة التتبع",
        href: "/dashboard/tracking",
        icon: Activity,
        permissions: [{ resource: permissionResources.VEHICLES, action: permissionActions.READ }],
      },
      {
        group: "branchOps" as const,
        title: labels.driverLabel || "السائقون",
        href: "/dashboard/drivers",
        icon: Users,
        permissions: [{ resource: permissionResources.DRIVERS, action: permissionActions.READ }],
      },
      {
        group: "branchOps" as const,
        title: labels.pointLabel || "النقاط",
        href: "/dashboard/points",
        icon: MapPin,
        permissions: [{ resource: permissionResources.POINTS, action: permissionActions.READ }],
      },
      {
        group: "branchOps" as const,
        title: "نقاط المؤسسة (من الاستبيانات)",
        href: "/dashboard/organization-points",
        icon: MapPinned,
        permissions: [{ resource: permissionResources.POINTS, action: permissionActions.READ }],
      },
      {
        group: "branchOps" as const,
        title: labels.routeLabel || "المسارات",
        href: "/dashboard/routes",
        icon: Route,
        permissions: [{ resource: permissionResources.ROUTES, action: permissionActions.READ }],
      },
      {
        group: "branchOps" as const,
        title: "أيام العمل",
        href: "/dashboard/work-schedules",
        icon: CalendarClock,
        permissions: [{ resource: permissionResources.WORK_SCHEDULES, action: permissionActions.READ }],
      },
      {
        group: "branchOps" as const,
        title: "فئات النقاط الأساسية والفرعية",
        href: "/dashboard/point-classifications",
        icon: Tags,
        permissions: [{ resource: permissionResources.POINT_CLASSIFICATIONS, action: permissionActions.READ }],
      },
      {
        group: "branchOps" as const,
        title: "الإدارة الجغرافية",
        href: "/dashboard/geography",
        icon: Globe,
        geographyPermission: true,
      },
      {
        group: "surveys" as const,
        title: labels.surveyLabel || "الاستبيانات",
        href: "/dashboard/surveys",
        icon: ClipboardList,
        permissions: [{ resource: permissionResources.FORMS, action: permissionActions.READ }],
        lineSupervisorCanSee: true,
      },
      {
        group: "reports" as const,
        title: "عام",
        href: "/dashboard/reports",
        icon: FileText,
        permissions: [{ resource: permissionResources.REPORTS, action: permissionActions.READ }],
      },
      {
        group: "reports" as const,
        title: labels.eventsReportLabel || "تقارير الأحداث",
        href: "/dashboard/event-reports",
        icon: Activity,
        permissions: [{ resource: permissionResources.REPORTS, action: permissionActions.READ }],
      },
      {
        group: "reports" as const,
        title: "سجل الزيارات",
        href: "/dashboard/visit-log",
        icon: ClipboardList,
        permissions: [{ resource: permissionResources.REPORTS, action: permissionActions.READ }],
      },
      {
        group: "userManagement" as const,
        title: "المستخدمون",
        href: "/dashboard/admin/users",
        icon: UserCog,
        adminOnly: true,
      },
      {
        group: "userManagement" as const,
        title: "إدارة الأدوار",
        href: "/dashboard/admin/roles",
        icon: KeyRound,
        adminOnly: true,
      },
      {
        group: "system" as const,
        title: "سجل Webhook",
        href: "/dashboard/admin/webhook-logs",
        icon: Webhook,
        adminOnly: true,
      },
      {
        group: "system" as const,
        title: "الإعدادات",
        href: "/dashboard/settings",
        icon: Settings,
      },
      {
        group: "materials" as const,
        title: "المواد",
        href: "/dashboard/materials",
        icon: Boxes,
        permissions: [{ resource: permissionResources.MATERIALS, action: permissionActions.READ }],
      },
    ],
    [
      labels.branchLabel,
      labels.driverLabel,
      labels.pointLabel,
      labels.routeLabel,
      labels.vehicleLabel,
      labels.lineSupervisorLabel,
      labels.surveyLabel,
      labels.eventsReportLabel,
    ]
  )

  const filteredMenuItems = menuItems.filter((item) => {
    if (item.href === "/dashboard") return !userIsLineSupervisor
    if ((item as any).organizationAdminOrSuperAdmin) return userIsOrgAdmin || userIsAdmin
    if (item.adminOnly && !userIsAdmin) return false
    if ((item as any).superAdminOnly && !userIsSuperAdmin) return false
    if (userIsAdmin) return true
    if ((item as any).geographyPermission) {
      return (
        userIsOrgAdmin ||
        userIsAdmin ||
        (isBranchAdmin(session?.user?.role as any) &&
          hasAnyPermission(session?.user?.role as any, [
            { resource: permissionResources.GOVERNORATES, action: permissionActions.READ },
            { resource: permissionResources.CITIES, action: permissionActions.READ },
            { resource: permissionResources.ROUTE_ZONES, action: permissionActions.READ },
          ]))
      )
    }
    if ((item as any).lineSupervisorCanSee && (userIsOrgAdmin || userIsAdmin)) return true
    if (item.permissions?.length) {
      return hasAnyPermission(session?.user?.role as any, item.permissions)
    }
    return true
  })

  const groupLabels: Record<string, string> = {
    home: "الرئيسية",
    organizations: "إدارة المؤسسات",
    branchOps: "عمليات",
    surveys: "الاستبيانات",
    reports: "التقارير",
    userManagement: "إدارة المستخدمين",
    materials: "المواد",
    system: "النظام",
  }

  const groupIcons: Record<string, typeof LayoutDashboard> = {
    home: LayoutDashboard,
    organizations: Building,
    branchOps: Building2,
    surveys: ClipboardList,
    reports: FileText,
    userManagement: UserCog,
    materials: Boxes,
    system: Settings,
  }

  const groupedItems = useMemo(() => {
    const map = new Map<string, typeof filteredMenuItems>()
    for (const item of filteredMenuItems) {
      const list = map.get(item.group) ?? []
      list.push(item)
      map.set(item.group, list)
    }
    const order = [
      "organizations",
      "branchOps",
      "surveys",
      "reports",
      "userManagement",
      "materials",
      "system",
    ] as const
    const homeItems = filteredMenuItems.filter((i) => (i as any).standaloneFirst)
    const groups = order
      .filter((key) => map.has(key) && map.get(key)!.length > 0)
      .map((key) => ({ groupKey: key, label: groupLabels[key], items: map.get(key)!, icon: groupIcons[key] }))
    if (homeItems.length > 0) {
      return [
        { groupKey: "home", label: groupLabels.home, items: homeItems, icon: LayoutDashboard, isStandalone: true },
        ...groups.map((g) => ({ ...g, isStandalone: false })),
      ]
    }
    return groups.map((g) => ({ ...g, isStandalone: false }))
  }, [filteredMenuItems])

  const navLoading = sessionStatus === "loading" || labelsLoading

  if (navLoading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    )
  }

  return (
    <nav
      dir="rtl"
      className="flex items-center gap-1 overflow-x-auto max-w-full text-right"
    >
      {groupedItems.map(({ groupKey, label, items, icon: GroupIcon, isStandalone }) => {
        if (isStandalone) {
          const item = items[0]
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Button
              key={groupKey}
              variant="ghost"
              size="sm"
              asChild
              className={cn(
                "gap-2 flex-row-reverse",
                isActive && "bg-primary/10 text-primary font-medium"
              )}
            >
              <Link href={item.href}>
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            </Button>
          )
        }

        return (
          <DropdownMenu
            key={groupKey}
            open={openGroup === groupKey}
            onOpenChange={(open) => {
              if (!open) setOpenGroup(null)
              else setOpenGroup(groupKey)
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-2 flex-row-reverse",
                  items.some(
                    (i) =>
                      pathname === i.href || (i.href !== "/dashboard" && pathname.startsWith(i.href))
                  ) && "bg-primary/10 text-primary font-medium"
                )}
              >
                {GroupIcon && <GroupIcon className="h-4 w-4" />}
                <span className="hidden sm:inline">{label}</span>
                <ChevronDown className="h-4 w-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="bottom"
              className="min-w-[220px]"
            >
              {items.map((item) => {
                const Icon = item.icon
                const isActive =
                  pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                return (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 flex-row-reverse cursor-pointer",
                        isActive && "bg-primary/10 text-primary font-medium"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.title}
                    </Link>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      })}
    </nav>
  )
}
