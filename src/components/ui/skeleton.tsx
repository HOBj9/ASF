"use client"

import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
    />
  )
}

/**
 * Table Skeleton - Shows skeleton rows for table loading
 */
export function TableSkeleton({ 
  rows = 5, 
  columns = 4,
  className 
}: { 
  rows?: number
  columns?: number
  className?: string 
}) {
  return (
    <div className={cn("rounded-md border", className)}>
      <div className="overflow-x-auto" dir="rtl">
        <table className="w-full" dir="rtl">
          <thead>
            <tr className="border-b bg-muted/50">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="h-12 px-4 text-right">
                  <Skeleton className="h-4 w-24" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody dir="rtl">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="p-4 text-right">
                    <Skeleton 
                      className={cn(
                        "h-4",
                        colIndex === 0 ? "w-32" : colIndex === columns - 1 ? "w-20" : "w-24"
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Chat List Skeleton - Shows skeleton items for chat list loading
 */
export function ChatListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="divide-y">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="p-4">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
            
            {/* Content */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Chat Message Skeleton - Shows skeleton messages in chat dialog
 */
export function ChatMessageSkeleton({ messages = 3 }: { messages?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: messages }).map((_, index) => {
        const isSent = index % 2 === 0
        return (
          <div
            key={index}
            className={cn("flex", isSent ? "justify-end" : "justify-start")}
          >
            <div className={cn(
              "max-w-[70%] rounded-lg px-4 py-2",
              isSent
                ? "bg-primary/10 rounded-tr-none"
                : "bg-background border border-border rounded-tl-none"
            )}>
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Card Skeleton - Generic card skeleton
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-6", className)}>
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  )
}

