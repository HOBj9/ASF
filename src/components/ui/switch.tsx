"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      checked = false,
      onCheckedChange,
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e)
      if (e.defaultPrevented) return
      onCheckedChange?.(!checked)
    }

    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        ref={ref}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent p-0.5 transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          checked
            ? "border-primary bg-primary"
            : "border-border bg-muted",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none absolute top-0.5 block h-5 w-5 shrink-0 rounded-full border border-border bg-primary-foreground shadow-sm transition-transform duration-200 ease-in-out",
            "left-0.5 rtl:left-auto rtl:right-0.5",
            checked ? "translate-x-5 rtl:translate-x-[-1.25rem]" : "translate-x-0"
          )}
          aria-hidden
        />
      </button>
    )
  }
)

Switch.displayName = "Switch"

export { Switch }
