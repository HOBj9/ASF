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
  MapPinned,
  Route,
  FileText,
  Boxes,
  UserCheck,
  MessageSquare,
  ClipboardList,
  Webhook,
  Activity,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  Pin,
  PinOff,
  Globe,
  CalendarClock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import { cn } from "@/lib/utils"
import { useSidebarStore } from "@/store/sidebar-store"
import { useEffect, useState, useMemo } from "react"
import { hasAnyPermission, hasPermission, isAdmin, isOrganizationAdmin, isBranchAdmin } from "@/lib/permissions"
import { permissionActions, permissionResources } from "@/constants/permissions"
import { useLabels } from "@/hooks/use-labels"
import { Skeleton } from "@/components/ui/skeleton"

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
  const { isOpen, toggle, close, open, isPinned, togglePin } = useSidebarStore()
  const { data: session, status: sessionStatus } = useSession()
  const [roleName, setRoleName] = useState<string | null>(initialUser.roleName || null)
  const { labels, loading: labelsLoading } = useLabels()
  const [roleLoading, setRoleLoading] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => ({
    general: false,
    organizations: false,
    branchOps: false,
    geography: false,
    surveys: false,
    reports: false,
    userManagement: false,
    system: false,
    materials: false,
  }))

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }))
  }

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

  const userIsOrgAdmin = useMemo(() => {
    return isOrganizationAdmin(session?.user?.role as any)
  }, [session?.user?.role])

  // Fetch role name when role changes
  useEffect(() => {
    const fetchRoleName = async () => {
      if (session?.user?.role) {
        try {
          setRoleLoading(true)
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
        } finally {
          setRoleLoading(false)
        }
      } else if (initialUser.roleName) {
        setRoleName(initialUser.roleName)
        setRoleLoading(false)
      }
    }

    fetchRoleName()
  }, [session?.user?.role, initialUser.roleName])

  const menuItems = useMemo(() => ([
    {
      group: "general" as const,
      title: "لوحة التحكم",
      href: "/dashboard",
      icon: LayoutDashboard,
      permissions: [{ resource: permissionResources.DASHBOARD, action: permissionActions.READ }],
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
      title: "نقاط المؤسسة",
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
      group: "geography" as const,
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
      group: "surveys" as const,
      title: `ردود ${labels.surveyLabel || "الاستبيانات"}`,
      href: "/dashboard/survey-responses",
      icon: MessageSquare,
      lineSupervisorCanSee: true,
      submissionsOrOrgAdmin: true,
    },
    {
      group: "reports" as const,
      title: "التقارير",
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
  ]), [labels.branchLabel, labels.driverLabel, labels.pointLabel, labels.routeLabel, labels.vehicleLabel, labels.lineSupervisorLabel, labels.surveyLabel, labels.eventsReportLabel])

  const filteredMenuItems = menuItems.filter(
    (item) => {
      if (item.href === "/dashboard") {
        return true
      }
      if ((item as any).organizationAdminOrSuperAdmin) {
        return userIsOrgAdmin || userIsAdmin
      }
      if ((item as any).submissionsOrOrgAdmin) {
        return (
          userIsOrgAdmin ||
          userIsAdmin ||
          hasAnyPermission(session?.user?.role as any, [
            { resource: permissionResources.FORM_SUBMISSIONS, action: permissionActions.READ },
          ])
        )
      }
      // Show admin-only items only for admin
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
      if (item.permissions && item.permissions.length > 0) {
        const role = session?.user?.role || null
        return hasAnyPermission(role as any, item.permissions)
      }
      return true
    }
  )

  const groupLabels: Record<string, string> = {
    general: "عام",
    organizations: "إدارة المؤسسات",
    branchOps: "الفرع والعمليات",
    geography: "الإدارة الجغرافية",
    surveys: "الاستبيانات",
    reports: "التقارير",
    userManagement: "إدارة المستخدمين",
    system: "النظام",
    materials: "المواد",
  }

  const groupIcons: Record<string, typeof LayoutDashboard> = {
    general: LayoutDashboard,
    organizations: Building,
    branchOps: Building2,
    geography: Globe,
    surveys: ClipboardList,
    reports: FileText,
    userManagement: UserCog,
    system: Settings,
    materials: Boxes,
  }

  const groupedItems = useMemo(() => {
    const map = new Map<string, typeof filteredMenuItems>()
    for (const item of filteredMenuItems) {
      const list = map.get(item.group) ?? []
      list.push(item)
      map.set(item.group, list)
    }
    const order: (keyof typeof groupLabels)[] = [
      "general",
      "organizations",
      "branchOps",
      "geography",
      "surveys",
      "reports",
      "userManagement",
      "system",
      "materials",
    ]
    return order
      .filter((key) => map.has(key) && map.get(key)!.length > 0)
      .map((key) => ({ groupKey: key, label: groupLabels[key], items: map.get(key)! }))
  }, [filteredMenuItems])
  const sidebarLoading = sessionStatus === "loading" || labelsLoading || roleLoading

  const isCollapsed = !isOpen

  const handleSidebarMouseEnter = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024 && !isPinned) open()
  }
  const handleSidebarMouseLeave = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024 && !isPinned) close()
  }

  const handleHeaderButtonClick = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      togglePin()
    } else {
      toggle()
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={close}
        />
      )}
      
      {/* Sidebar: on desktop (lg) opens on hover and closes when mouse leaves */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 right-0 z-50 flex h-screen lg:h-full flex-col transition-all duration-300 ease-in-out shrink-0",
          "w-72 lg:w-20",
          isOpen && "lg:w-72",
          "lg:m-4 lg:rounded-2xl lg:max-h-[calc(100vh-2rem)]",
          "bg-gradient-to-br from-background via-background/95 to-background/90",
          "backdrop-blur-xl bg-opacity-80 dark:bg-opacity-90",
          "border-l lg:border lg:rounded-2xl border-border/50",
          "shadow-2xl shadow-black/10 dark:shadow-black/40",
          "lg:shadow-[0_8px_32px_0_rgba(0,0,0,0.12)] dark:lg:shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]",
          isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      >
        {/* Header */}
        <div className="border-b border-border/50 bg-gradient-to-l from-[hsl(var(--primary))]/20 via-[hsl(var(--primary))]/10 to-transparent dark:from-[hsl(var(--primary))]/30 dark:via-[hsl(var(--primary))]/15 backdrop-blur-sm lg:rounded-t-2xl">
          <div className={cn("flex h-12 items-center", isCollapsed ? "justify-center px-0" : "justify-end px-6")}>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleHeaderButtonClick}
              className={cn(
                "hover:bg-[hsl(var(--sidebar-item-hover))] rounded-lg",
                "lg:flex",
                isCollapsed && "lg:mx-auto",
                isPinned && "lg:bg-primary/10"
              )}
              title={isPinned ? "إلغاء التثبيت" : "تثبيت القائمة (مفتوح أو مغلق)"}
            >
              <X className="h-5 w-5 lg:hidden" />
              {isPinned ? (
                <PinOff className="h-5 w-5 hidden lg:block" />
              ) : (
                <Pin className="h-5 w-5 hidden lg:block" />
              )}
            </Button>
          </div>
          
          {/* User Profile Section */}
          <div className={cn("pt-2 pb-2", isCollapsed ? "px-2" : "px-6")}>
            {sidebarLoading ? (
              <div className={cn("flex rounded-xl px-3 py-2", isCollapsed ? "justify-center" : "items-center gap-3")}>
                <Skeleton className={cn("rounded-full", isCollapsed ? "h-10 w-10" : "h-12 w-12")} />
                {!isCollapsed && (
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/dashboard/profile"
                className={cn(
                  "flex rounded-xl px-3 py-2 hover:bg-[hsl(var(--sidebar-item-hover))] transition-all duration-200 text-right group",
                  isCollapsed ? "justify-center" : "items-center gap-3"
                )}
                title={isCollapsed ? currentUser.name : undefined}
              >
                <div className="relative">
                  {currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className={cn(
                        "rounded-full object-cover border-2 border-[hsl(var(--primary))]/30 dark:border-[hsl(var(--primary))]/40 group-hover:border-[hsl(var(--primary))]/50 transition-all",
                        isCollapsed ? "h-10 w-10" : "h-12 w-12"
                      )}
                    />
                  ) : (
                    <div className={cn(
                      "rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary-light))] flex items-center justify-center border-2 border-[hsl(var(--primary))]/30 dark:border-[hsl(var(--primary))]/40 group-hover:border-[hsl(var(--primary))]/50 transition-all text-white",
                      isCollapsed ? "h-10 w-10" : "h-12 w-12"
                    )}>
                      <User className={isCollapsed ? "h-5 w-5" : "h-6 w-6"} />
                    </div>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      مرحبًا، {currentUser.name}
                    </p>
                  </div>
                )}
              </Link>
            )}
          </div>
        </div>
        
        {/* Navigation */}
        <nav className={cn("flex-1 overflow-y-auto", isCollapsed ? "space-y-1 p-2" : "space-y-4 p-4")}>
          {sidebarLoading ? (
            <div className="space-y-2">
              {Array.from({ length: isCollapsed ? 6 : 8 }).map((_, idx) => (
                <div key={`sidebar-skeleton-${idx}`} className={cn("rounded-xl", isCollapsed ? "flex justify-center py-2" : "flex items-center gap-3 px-4 py-3")}>
                  <Skeleton className={cn("rounded-full", isCollapsed ? "h-9 w-9" : "h-5 w-5")} />
                  {!isCollapsed && <Skeleton className="h-4 flex-1" />}
                </div>
              ))}
            </div>
          ) : isCollapsed ? (
            /* Collapsed: icon-only list */
            <div className="space-y-1">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.title}
                    className={cn(
                      "flex items-center justify-center rounded-xl py-3 text-sm font-medium transition-all duration-200",
                      "group relative",
                      isActive
                        ? "bg-gradient-to-l from-[hsl(var(--sidebar-item-active-bg))] via-[hsl(var(--sidebar-item-active-bg))]/90 to-[hsl(var(--sidebar-item-active-bg))]/80 text-[hsl(var(--sidebar-item-active-text))] shadow-lg shadow-[hsl(var(--sidebar-item-active-bg))]/40"
                        : "text-foreground/70 hover:bg-[hsl(var(--sidebar-item-hover))] hover:text-foreground"
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5 transition-transform duration-200",
                      isActive ? "text-[hsl(var(--sidebar-item-active-text))]" : "text-foreground/70 group-hover:scale-110 group-hover:text-[hsl(var(--icon-hover))]"
                    )} />
                  </Link>
                )
              })}
            </div>
          ) : (
            groupedItems.map(({ groupKey, label, items }, groupIndex) => {
              const isExpanded = expandedGroups[groupKey] !== false
              const GroupIcon = groupIcons[groupKey]
              return (
                <div key={groupKey} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupKey)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                      "hover:bg-[hsl(var(--sidebar-item-hover))] hover:text-foreground transition-colors"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {GroupIcon && <GroupIcon className="h-4 w-4 shrink-0" />}
                      {label}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform duration-200",
                        isExpanded ? "rotate-0" : "-rotate-90"
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-200 ease-in-out",
                      isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    )}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="space-y-1 pt-0.5">
                        {items.map((item, index) => {
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
                              style={{ animationDelay: `${(groupIndex * 10 + index) * 50}ms` }}
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
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </nav>
      </aside>
    </>
  )
}






