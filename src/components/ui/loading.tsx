"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const DEFAULT_LOADING_TEXT = "جاري التحميل"

interface LoadingProps {
  className?: string
  size?: "sm" | "md" | "lg"
  /** Optional: omit for lightweight spinner-only display */
  text?: string
  fullScreen?: boolean
}

/**
 * Three dots loading animation component (kept for backward compatibility)
 */
export function Spinner({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const dotSizeClasses = { sm: "h-2 w-2", md: "h-3 w-3", lg: "h-4 w-4" }
  const gapClasses = { sm: "gap-1.5", md: "gap-2", lg: "gap-2.5" }
  return (
    <div className={cn("flex items-center", gapClasses[size], className)}>
      {[0, 0.2, 0.4].map((delay) => (
        <div
          key={delay}
          className={cn("rounded-full bg-[hsl(var(--loader-primary))] animate-dot-pulse", dotSizeClasses[size])}
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  )
}

/**
 * Circular loading spinner (Loader2 icon with animate-spin)
 * Single source for all circular loading in the app.
 */
export function CircularSpinner({ size = "md", className }: { size?: "xs" | "sm" | "md" | "lg"; className?: string }) {
  const sizeClasses = { xs: "h-4 w-4", sm: "h-6 w-6", md: "h-8 w-8", lg: "h-10 w-10" }
  return (
    <Loader2
      className={cn(sizeClasses[size], "animate-spin text-primary", className)}
      aria-hidden
    />
  )
}

export function Loading({ className, size = "md", text = DEFAULT_LOADING_TEXT, fullScreen = false }: LoadingProps) {
  const showText = text !== undefined && text !== ""
  const content = (
    <div className="flex flex-col items-center gap-4">
      <CircularSpinner size={size} />
      {showText && (
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {text}
        </p>
      )}
    </div>
  )
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 dark:bg-background/95 backdrop-blur-lg">
        <div className="flex flex-col items-center gap-6">
          <CircularSpinner size={size} />
          {showText && (
            <p className="text-base font-medium text-muted-foreground animate-pulse">
              {text}
            </p>
          )}
        </div>
      </div>
    )
  }
  return (
    <div className={cn("flex items-center justify-center p-8 min-h-[120px]", className)}>
      {content}
    </div>
  )
}

export function LoadingOverlay({ text }: { text?: string } = {}) {
  const showText = text !== undefined && text !== ""
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 dark:bg-background/80 backdrop-blur-sm rounded-xl">
      <div className="flex flex-col items-center gap-3">
        <CircularSpinner size="sm" />
        {showText && (
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            {text}
          </p>
        )}
      </div>
    </div>
  )
}

export function LoadingCard({ text }: { text?: string } = {}) {
  const showText = text !== undefined && text !== ""
  return (
    <div className="rounded-xl border bg-card/50 dark:bg-card/70 backdrop-blur-sm p-8 shadow-lg relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--loader-primary))]/5 via-transparent to-[hsl(var(--loader-secondary))]/5" />
      <div className="relative flex flex-col items-center justify-center gap-4 min-h-[200px]">
        <CircularSpinner size="lg" />
        {showText && (
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            {text}
          </p>
        )}
      </div>
    </div>
  )
}

