"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [displayChildren, setDisplayChildren] = useState(children)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setIsAnimating(true)
    const timer = setTimeout(() => {
      setDisplayChildren(children)
      setIsAnimating(false)
    }, 150)

    return () => clearTimeout(timer)
  }, [pathname, children])

  return (
    <div
      className={isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}
      style={{
        transition: "opacity 0.3s ease-out, transform 0.3s ease-out",
      }}
    >
      {displayChildren}
    </div>
  )
}

