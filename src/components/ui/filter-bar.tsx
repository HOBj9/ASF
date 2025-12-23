"use client"

import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FilterOption {
  value: string
  label: string
}

interface FilterBarProps {
  filters: Array<{
    id: string
    label: string
    options: FilterOption[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
  }>
  className?: string
}

export const FilterBar = React.forwardRef<HTMLDivElement, FilterBarProps>(
  ({ filters, className }, ref) => {
    return (
      <div ref={ref} className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", className)}>
        {filters.map((filter) => (
          <div key={filter.id} className="space-y-2">
            <Label htmlFor={filter.id} className="text-right">
              {filter.label}
            </Label>
            <Select value={filter.value} onValueChange={filter.onChange}>
              <SelectTrigger id={filter.id} className="text-right">
                <SelectValue placeholder={filter.placeholder || "الكل"} />
              </SelectTrigger>
              <SelectContent>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    )
  }
)

FilterBar.displayName = "FilterBar"

