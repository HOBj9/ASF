"use client"

import * as React from "react"
import { Button, ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LucideIcon, Loader2 } from "lucide-react"

interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: LucideIcon
  label: string
  showTooltip?: boolean
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right'
  loading?: boolean
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon: Icon, label, showTooltip = false, tooltipSide = 'top', loading = false, className, disabled, ...props }, ref) => {
    const isLoading = loading || disabled
    
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className={cn(className)}
        aria-label={label}
        title={showTooltip ? label : undefined}
        disabled={isLoading}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </Button>
    )
  }
)

IconButton.displayName = "IconButton"

