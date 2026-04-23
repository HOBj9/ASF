"use client"

import { motion } from "framer-motion"
import { useTransform } from "framer-motion"
import type { MotionValue } from "framer-motion"
import type { RefObject } from "react"

type RoutePathProps = {
  pathD: string
  pathLength: number
  progress: MotionValue<number>
  compact: boolean
  prefersReducedMotion: boolean
  pathRef: RefObject<SVGPathElement | null>
}

export function RoutePath({ pathD, pathLength, progress, compact, prefersReducedMotion, pathRef }: RoutePathProps) {
  const dashOffset = useTransform(progress, (value) => (1 - value) * (pathLength || 1))

  return (
    <>
      <defs>
        <filter id="landing-route-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="landing-route-gradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.95" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
        </linearGradient>
      </defs>

      <path
        d={pathD}
        stroke="hsl(var(--primary) / 0.32)"
        strokeWidth={compact ? 18 : 28}
        fill="none"
        strokeLinecap="round"
        filter="url(#landing-route-glow)"
      />
      <path
        d={pathD}
        stroke="hsl(var(--primary) / 0.46)"
        strokeWidth={compact ? 10 : 14}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={pathD}
        stroke="hsl(var(--primary) / 0.72)"
        strokeWidth={compact ? 6 : 8}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={compact ? "10 16" : "14 20"}
      />
      <motion.path
        d={pathD}
        stroke="hsl(var(--primary) / 0.92)"
        strokeWidth={compact ? 4 : 6}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={compact ? "26 36" : "36 48"}
        animate={prefersReducedMotion ? undefined : { strokeDashoffset: [0, -420] }}
        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
      />
      <motion.path
        ref={pathRef}
        d={pathD}
        stroke="url(#landing-route-gradient)"
        strokeWidth={compact ? 6 : 8}
        fill="none"
        strokeLinecap="round"
        initial={false}
        strokeDasharray={pathLength || 1}
        style={{ strokeDashoffset: dashOffset }}
        animate={prefersReducedMotion ? { opacity: 0.9 } : { opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 2.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        filter="url(#landing-route-glow)"
      />
    </>
  )
}
