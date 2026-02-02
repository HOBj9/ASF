"use client"

import { cn } from "@/lib/utils"
import { themeConfig } from "@/lib/config/theme.config"
import { LucideIcon } from "lucide-react"

interface StatusBadgeProps {
  status: string
  type?: "session" | "message" | "campaign" | "user"
  label?: string
  className?: string
  icon?: LucideIcon
  onClick?: () => void
}

export function StatusBadge({ 
  status, 
  type = "session", 
  label, 
  className,
  icon: Icon,
  onClick 
}: StatusBadgeProps) {
  let config: { label: string; className: string } | undefined

  if (type === "session") {
    config = themeConfig.statusBadges.session[status as keyof typeof themeConfig.statusBadges.session]
  } else if (type === "message") {
    config = themeConfig.statusBadges.message[status as keyof typeof themeConfig.statusBadges.message]
  } else if (type === "campaign") {
    config = themeConfig.statusBadges.campaign[status as keyof typeof themeConfig.statusBadges.campaign]
  } else if (type === "user") {
    const isActive = status === "active" || status === "ظ†ط´ط·"
    config = {
      label: isActive ? "ظ†ط´ط·" : "ظ…ط¹ط·ظ„",
      className: isActive 
        ? themeConfig.colors.userStatus.active.full
        : themeConfig.colors.userStatus.inactive.full,
    }
  }

  if (!config) {
    return null
  }

  const Component = onClick ? "button" : "span"
  const displayLabel = label || config.label

  return (
    <Component
      onClick={onClick}
      className={cn(
        "px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1",
        config.className,
        onClick && "hover:opacity-80 transition-colors cursor-pointer",
        className
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {displayLabel}
    </Component>
  )
}

