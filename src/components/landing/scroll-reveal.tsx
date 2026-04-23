"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type ScrollRevealProps = {
  children: React.ReactNode
  className?: string
  delayMs?: number
}

export function ScrollReveal({ children, className, delayMs = 0 }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delayMs}ms` }}
      className={cn(
        "motion-reduce:transform-none motion-reduce:transition-none motion-reduce:opacity-100",
        "transform-gpu transition-all duration-700 ease-out will-change-transform",
        visible ? "translate-y-0 opacity-100 blur-0" : "translate-y-4 opacity-0 blur-[2px]",
        className,
      )}
    >
      {children}
    </div>
  )
}
