"use client"

import { useCallback } from "react"
import { useMotionValue, useMotionValueEvent, useScroll } from "framer-motion"

type ComputeProgress = (scrollY: number) => number

function clamp01(value: number) {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

export function useScrollProgress(computeProgress: ComputeProgress) {
  const { scrollY } = useScroll()
  const progress = useMotionValue(0)

  const updateProgress = useCallback(
    (latestScrollY: number) => {
      progress.set(clamp01(computeProgress(latestScrollY)))
    },
    [computeProgress, progress],
  )

  useMotionValueEvent(scrollY, "change", updateProgress)

  return { scrollY, progress, updateProgress }
}
