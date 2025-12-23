// @ts-nocheck
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
// @ts-ignore - lucide-react types are available at runtime
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  showPageNumbers?: boolean
  maxVisiblePages?: number
}

export const Pagination = React.forwardRef<HTMLDivElement, PaginationProps>(
  function Pagination(props: PaginationProps, ref: React.ForwardedRef<HTMLDivElement>) {
    const { currentPage, totalPages, onPageChange, className, showPageNumbers = true, maxVisiblePages = 5 } = props
    
    const getVisiblePages = (): (number | string)[] => {
      if (!showPageNumbers) return []
      
      const pages: (number | string)[] = []
      const half = Math.floor(maxVisiblePages / 2)
      
      let start = Math.max(1, currentPage - half)
      let end = Math.min(totalPages, currentPage + half)
      
      if (currentPage <= half) {
        end = Math.min(totalPages, maxVisiblePages)
      }
      
      if (currentPage >= totalPages - half) {
        start = Math.max(1, totalPages - maxVisiblePages + 1)
      }
      
      if (start > 1) {
        pages.push(1)
        if (start > 2) pages.push('...')
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...')
        pages.push(totalPages)
      }
      
      return pages
    }

    const visiblePages = getVisiblePages()

    if (totalPages <= 1) return null

    return (
      <div ref={ref} className={cn("flex items-center justify-center gap-2", className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="الصفحة السابقة"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        {showPageNumbers && (
          <div className="flex items-center gap-1">
            {visiblePages.map((page, index) => (
              <React.Fragment key={index}>
                {page === '...' ? (
                  <span className="px-2 py-1 text-muted-foreground">...</span>
                ) : (
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(page as number)}
                    className="min-w-[2.5rem]"
                  >
                    {page}
                  </Button>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="الصفحة التالية"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    )
  }
)

Pagination.displayName = "Pagination"
