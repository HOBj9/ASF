"use client"

import * as React from "react"
import { getMessage } from "@/constants/messages"
import { cn } from "@/lib/utils"

interface TextProps extends React.HTMLAttributes<HTMLElement> {
  messageKey: string
  params?: Record<string, string | number>
  as?: 'span' | 'p' | 'div' | 'label' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

export const Text = React.forwardRef<HTMLElement, TextProps>(
  ({ messageKey, params, as: Component = 'span', className, ...props }, ref) => {
    const text = getMessage(messageKey, params)
    
    return (
      <Component
        ref={ref as any}
        className={cn(className)}
        {...props}
      >
        {text}
      </Component>
    )
  }
)

Text.displayName = "Text"

