"use client"

import { cn } from "@/lib/utils"

interface LoadingProps {
  className?: string
  size?: "sm" | "md" | "lg"
  text?: string
  fullScreen?: boolean
}

/**
 * Three dots loading animation component
 * Dots appear and fade one by one in sequence
 */
export function Spinner({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const dotSizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  }

  const gapClasses = {
    sm: "gap-1.5",
    md: "gap-2",
    lg: "gap-2.5",
  }

  return (
    <div className={cn("flex items-center", gapClasses[size], className)}>
      <div
        className={cn(
          "rounded-full bg-[hsl(var(--loader-primary))]",
          dotSizeClasses[size],
          "animate-dot-pulse"
        )}
        style={{
          animationDelay: "0s",
        }}
      />
      <div
        className={cn(
          "rounded-full bg-[hsl(var(--loader-primary))]",
          dotSizeClasses[size],
          "animate-dot-pulse"
        )}
        style={{
          animationDelay: "0.2s",
        }}
      />
      <div
        className={cn(
          "rounded-full bg-[hsl(var(--loader-primary))]",
          dotSizeClasses[size],
          "animate-dot-pulse"
        )}
        style={{
          animationDelay: "0.4s",
        }}
      />
    </div>
  )
}

export function Loading({ className, size = "md", text, fullScreen = false }: LoadingProps) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 dark:bg-background/95 backdrop-blur-lg">
        <div className="flex flex-col items-center gap-6">
          <Spinner size={size} />
          {text && (
            <div className="text-center px-4">
              <p className="text-base font-semibold animate-pulse bg-gradient-to-r from-[hsl(var(--loader-primary))] via-[hsl(var(--loader-secondary))] to-[hsl(var(--loader-primary))] bg-clip-text text-transparent">
                {text}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center justify-center p-8", className)}>
      <div className="flex flex-col items-center gap-4">
        <Spinner size={size} />
        {text && (
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            {text}
          </p>
        )}
      </div>
    </div>
  )
}

export function LoadingOverlay({ text }: { text?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 dark:bg-background/80 backdrop-blur-sm rounded-xl">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="md" />
        {text && (
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            {text}
          </p>
        )}
      </div>
    </div>
  )
}

export function LoadingCard({ text }: { text?: string }) {
  return (
    <div className="rounded-xl border bg-card/50 dark:bg-card/70 backdrop-blur-sm p-8 shadow-lg relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--loader-primary))]/5 via-transparent to-[hsl(var(--loader-secondary))]/5" />
      <div className="relative flex flex-col items-center justify-center gap-4 min-h-[200px]">
        <Spinner size="lg" />
        {text && (
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            {text}
          </p>
        )}
      </div>
    </div>
  )
}

