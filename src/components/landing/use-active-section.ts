"use client"

import { useEffect, useMemo, useState } from "react"

type UseActiveSectionOptions = {
  sectionIds: string[]
  headerOffset?: number
  viewportAnchor?: number
  hysteresisPx?: number
}

const DEFAULT_HEADER_OFFSET = 96
const DEFAULT_VIEWPORT_ANCHOR = 0.42
const DEFAULT_HYSTERESIS = 72

function getSectionMetrics(id: string, headerOffset: number) {
  const section = document.getElementById(id)
  if (!section) return null

  const rect = section.getBoundingClientRect()
  const top = rect.top + window.scrollY - headerOffset
  const bottom = top + Math.max(rect.height, 120)
  return { id, top, bottom }
}

function getCenterDistance(target: number, rangeStart: number, rangeEnd: number) {
  if (target < rangeStart) return rangeStart - target
  if (target > rangeEnd) return target - rangeEnd
  return 0
}

export function useActiveSection({
  sectionIds,
  headerOffset = DEFAULT_HEADER_OFFSET,
  viewportAnchor = DEFAULT_VIEWPORT_ANCHOR,
  hysteresisPx = DEFAULT_HYSTERESIS,
}: UseActiveSectionOptions) {
  const normalizedSectionIds = useMemo(() => sectionIds.filter(Boolean), [sectionIds])
  const [activeSection, setActiveSection] = useState(normalizedSectionIds[0] ?? "")

  useEffect(() => {
    if (!normalizedSectionIds.length) return

    let rafId = 0

    const updateActiveSection = () => {
      const viewportCenter = window.scrollY + window.innerHeight * viewportAnchor
      const sections = normalizedSectionIds
        .map((id) => getSectionMetrics(id, headerOffset))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))

      if (!sections.length) return

      const lastSection = sections[sections.length - 1]
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        setActiveSection(lastSection.id)
        return
      }

      let best = sections[0]
      let bestDistance = getCenterDistance(viewportCenter, best.top, best.bottom)

      for (let index = 1; index < sections.length; index += 1) {
        const section = sections[index]
        const distance = getCenterDistance(viewportCenter, section.top, section.bottom)
        if (distance < bestDistance) {
          best = section
          bestDistance = distance
        }
      }

      const current = sections.find((section) => section.id === activeSection)
      if (current) {
        const currentDistance = getCenterDistance(viewportCenter, current.top, current.bottom)
        if (currentDistance <= bestDistance + hysteresisPx) {
          return
        }
      }

      setActiveSection(best.id)
    }

    const scheduleUpdate = () => {
      cancelAnimationFrame(rafId)
      rafId = window.requestAnimationFrame(updateActiveSection)
    }

    scheduleUpdate()
    window.addEventListener("scroll", scheduleUpdate, { passive: true })
    window.addEventListener("resize", scheduleUpdate)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("scroll", scheduleUpdate)
      window.removeEventListener("resize", scheduleUpdate)
    }
  }, [activeSection, headerOffset, hysteresisPx, normalizedSectionIds, viewportAnchor])

  useEffect(() => {
    if (!normalizedSectionIds.includes(activeSection)) {
      setActiveSection(normalizedSectionIds[0] ?? "")
    }
  }, [activeSection, normalizedSectionIds])

  return { activeSection, setActiveSection }
}
