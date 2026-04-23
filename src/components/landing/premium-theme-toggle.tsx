"use client"

import { motion, useReducedMotion } from "framer-motion"
import { MoonStar, SunMedium } from "lucide-react"
import { cn } from "@/lib/utils"

type PremiumThemeToggleProps = {
  checked: boolean
  onToggle: () => void
  label?: string
}

export function PremiumThemeToggle({ checked, onToggle, label = "Toggle theme" }: PremiumThemeToggleProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="group relative inline-flex h-9 w-[74px] items-center rounded-full p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2"
    >
      <span className="absolute inset-0 rounded-full border border-primary/24 bg-[linear-gradient(145deg,hsl(var(--primary)/0.16),hsl(var(--primary)/0.05)_48%,hsl(var(--background))_100%)] shadow-[inset_0_1px_0_hsl(var(--primary-foreground)/0.12),inset_0_-8px_18px_hsl(var(--foreground)/0.08),0_10px_24px_-18px_hsl(var(--primary)/0.45)] transition-all duration-500 group-hover:shadow-[inset_0_1px_0_hsl(var(--primary-foreground)/0.15),inset_0_-10px_20px_hsl(var(--foreground)/0.1),0_14px_28px_-18px_hsl(var(--primary)/0.55)]" />
      <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_20%_15%,hsl(var(--primary)/0.2),transparent_45%)] opacity-75" />

      <span className="relative z-10 grid h-full w-full grid-cols-2 items-center px-1.5 text-[9px] font-semibold uppercase tracking-[0.12em]">
        <span className={cn("inline-flex items-center justify-start transition-colors duration-300", checked ? "text-primary-foreground/95" : "text-black/60")}>
          
        </span>
        <span
          className={cn(
            "inline-flex items-center justify-end text-right transition-colors duration-300",
            checked ? "text-muted-foreground/90" : "text-black",
          )}
        >
          
        </span>
      </span>

      <motion.span
        className="absolute left-1 top-1.5 z-20 flex h-6 w-8 items-center justify-center rounded-full border border-primary-foreground/30 bg-[linear-gradient(180deg,hsl(var(--primary)/0.72),hsl(var(--primary)/0.58))] shadow-[inset_0_1px_0_hsl(var(--primary-foreground)/0.22),0_8px_12px_-10px_hsl(var(--primary)/0.55)]"
        initial={false}
        animate={{ x: checked ? 0 : 34, scale: checked ? 1 : 0.99 }}
        transition={{
          duration: prefersReducedMotion ? 0.2 : 0.52,
          ease: [0.2, 0.8, 0.2, 1],
        }}
      >
        <span className="absolute inset-[1px] rounded-full bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary-foreground)/0.35),transparent_45%)]" />
        <span className="relative z-10 inline-flex items-center justify-center">
          {checked ? (
            <MoonStar className="h-3.5 w-3.5 text-black/80 dark:text-primary-foreground/85" />
          ) : (
            <SunMedium className="h-3.5 w-3.5 text-black/80 dark:text-primary-foreground/85" />
          )}
        </span>
        <motion.span
          className="absolute left-[6px] top-[5px] h-1 w-1 rounded-full bg-primary-foreground/75"
          animate={prefersReducedMotion ? { opacity: 0.75 } : { opacity: [0.4, 0.8, 0.4], scale: [0.9, 1.2, 0.9] }}
          transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <motion.span
          className="absolute right-[6px] bottom-[5px] h-[3px] w-[3px] rounded-full bg-primary-foreground/65"
          animate={prefersReducedMotion ? { opacity: 0.65 } : { opacity: [0.3, 0.7, 0.3], scale: [0.8, 1.15, 0.8] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.35 }}
        />
      </motion.span>
    </button>
  )
}
