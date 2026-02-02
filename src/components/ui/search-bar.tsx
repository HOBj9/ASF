"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { getMessage } from "@/constants/messages"

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (query: string) => void
  debounceMs?: number
}

export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className, onSearch, debounceMs = 300, onChange, ...props }, ref) => {
    const [searchQuery, setSearchQuery] = React.useState("")
    const timeoutRef = React.useRef<NodeJS.Timeout>()

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setSearchQuery(value)
      
      if (onChange) {
        onChange(e)
      }

      if (onSearch) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        
        timeoutRef.current = setTimeout(() => {
          onSearch(value)
        }, debounceMs)
      }
    }

    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    }, [])

    return (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={ref}
          type="search"
          value={searchQuery}
          onChange={handleChange}
          placeholder={props.placeholder || getMessage('tables.searchPlaceholder')}
          className={cn("pl-10", className)}
          {...props}
        />
      </div>
    )
  }
)

SearchBar.displayName = "SearchBar"

