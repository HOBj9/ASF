"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface DateDisplayProps {
  date: string | Date
  className?: string
  format?: 'full' | 'date' | 'time'
}

const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

export function DateDisplay({ date, className, format = 'full' }: DateDisplayProps) {
  const [formattedDate, setFormattedDate] = useState<string>("")

  useEffect(() => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      
      if (isNaN(dateObj.getTime())) {
        setFormattedDate(String(date))
        return
      }

      const year = dateObj.getFullYear()
      const month = monthNames[dateObj.getMonth()]
      const day = dateObj.getDate().toString().padStart(2, '0')
      const hours = dateObj.getHours().toString().padStart(2, '0')
      const minutes = dateObj.getMinutes().toString().padStart(2, '0')
      const seconds = dateObj.getSeconds().toString().padStart(2, '0')

      let formatted = ''
      
      switch (format) {
        case 'date':
          formatted = `${year}-${month}-${day}`
          break
        case 'time':
          formatted = `${hours}:${minutes}:${seconds}`
          break
        case 'full':
        default:
          formatted = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
          break
      }

      setFormattedDate(formatted)
    } catch (error) {
      setFormattedDate(String(date))
    }
  }, [date, format])

  return (
    <span className={cn("font-mono text-sm", className)}>
      {formattedDate || String(date)}
    </span>
  )
}

