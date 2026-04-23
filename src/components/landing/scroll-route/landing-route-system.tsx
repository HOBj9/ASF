"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useReducedMotion, useTransform, useMotionValueEvent, useMotionValue, useSpring } from "framer-motion"
import { RoutePath } from "@/components/landing/scroll-route/route-path"
import { RouteVehicle } from "@/components/landing/scroll-route/route-vehicle"
import type { RouteDir, RouteStopPoint } from "@/components/landing/scroll-route/route-types"
import { useScrollProgress } from "@/components/landing/scroll-route/use-scroll-progress"

const SECTION_IDS = ["home", "overview", "features", "workflow", "stats", "cta"] as const
const VEHICLE_HEADING_OFFSET = 180

function normalizeAngleDelta(delta: number) {
  let next = delta
  while (next > 180) next -= 360
  while (next < -180) next += 360
  return next
}

function normalizeSignedAngle(angle: number) {
  let next = angle
  while (next > 180) next -= 360
  while (next < -180) next += 360
  return next
}

function isUprightAngle(angle: number) {
  const normalized = normalizeSignedAngle(angle)
  return normalized >= -100 && normalized <= 100
}

function pickStableVehicleAngle(rawAngle: number, previousAngle: number) {
  const candidates = [rawAngle, rawAngle + 180, rawAngle - 180]
  const uprightCandidates = candidates.filter((candidate) => isUprightAngle(candidate))
  const pool = uprightCandidates.length ? uprightCandidates : candidates

  let best = pool[0]
  let bestDelta = Math.abs(normalizeAngleDelta(best - previousAngle))

  for (let i = 1; i < pool.length; i += 1) {
    const candidate = pool[i]
    const deltaAbs = Math.abs(normalizeAngleDelta(candidate - previousAngle))
    if (deltaAbs < bestDelta) {
      best = candidate
      bestDelta = deltaAbs
    }
  }

  return previousAngle + normalizeAngleDelta(best - previousAngle)
}

function buildPathD(stops: RouteStopPoint[], startPoint: { x: number; y: number } | null) {
  if (!stops.length) return ""
  if (startPoint) {
    const first = stops[0]
    const controlX = (startPoint.x + first.x) / 2
    let d = `M ${startPoint.x} ${startPoint.y} C ${controlX} ${startPoint.y}, ${controlX} ${first.y}, ${first.x} ${first.y}`

    for (let i = 1; i < stops.length; i += 1) {
      const prev = stops[i - 1]
      const curr = stops[i]
      const controlY = (prev.y + curr.y) / 2
      d += ` C ${prev.x} ${controlY}, ${curr.x} ${controlY}, ${curr.x} ${curr.y}`
    }
    return d
  }

  if (stops.length === 1) {
    const leadStartX = Math.max(28, stops[0].x - 140)
    return `M ${leadStartX} ${stops[0].y} Q ${stops[0].x - 60} ${stops[0].y}, ${stops[0].x} ${stops[0].y}`
  }

  const first = stops[0]
  const leadStartX = Math.max(28, first.x - 140)
  let d = `M ${leadStartX} ${first.y} Q ${first.x - 60} ${first.y}, ${first.x} ${first.y}`

  for (let i = 1; i < stops.length; i += 1) {
    const prev = stops[i - 1]
    const curr = stops[i]
    const controlY = (prev.y + curr.y) / 2
    d += ` C ${prev.x} ${controlY}, ${curr.x} ${controlY}, ${curr.x} ${curr.y}`
  }
  return d
}

function interpolateProgressFromStops(stops: RouteStopPoint[], scrollY: number, viewportHeight: number) {
  if (stops.length < 2 || viewportHeight <= 0) return 0
  const triggers = stops.map((stop) => stop.y - viewportHeight * 0.55)
  const lastIndex = triggers.length - 1

  if (scrollY <= triggers[0]) return 0
  if (scrollY >= triggers[lastIndex]) return 1

  for (let i = 0; i < lastIndex; i += 1) {
    const start = triggers[i]
    const end = triggers[i + 1]
    if (scrollY >= start && scrollY <= end) {
      const local = end > start ? (scrollY - start) / (end - start) : 0
      return (i + local) / lastIndex
    }
  }

  return 1
}

function updateActiveMarker(stops: RouteStopPoint[], progress: number) {
  if (!stops.length) return
  const activeIndex = Math.round(progress * (stops.length - 1))
  const elements = document.querySelectorAll<HTMLElement>("[data-route-stop]")

  elements.forEach((el) => {
    const stopId = el.dataset.routeStop ?? ""
    const index = stops.findIndex((stop) => stop.id === stopId)
    el.dataset.routeActive = index === activeIndex ? "true" : "false"
  })
}

export function LandingRouteSystem({ dir }: { dir: RouteDir }) {
  const prefersReducedMotion = useReducedMotion()
  const pathRef = useRef<SVGPathElement | null>(null)
  const pathLengthRef = useRef(0)
  const stopsRef = useRef<RouteStopPoint[]>([])
  const viewportHeightRef = useRef(0)
  const lastAngleRef = useRef(0)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [docHeight, setDocHeight] = useState(0)
  const [pathD, setPathD] = useState("")
  const [pathLengthState, setPathLengthState] = useState(0)

  const vehicleX = useMotionValue(0)
  const vehicleY = useMotionValue(0)
  const vehicleAngle = useMotionValue(0)

  const computeProgress = useCallback((scrollY: number) => {
    return interpolateProgressFromStops(stopsRef.current, scrollY, viewportHeightRef.current)
  }, [])

  const { progress, updateProgress } = useScrollProgress(computeProgress)
  const smoothProgress = useSpring(progress, {
    stiffness: prefersReducedMotion ? 280 : 160,
    damping: prefersReducedMotion ? 34 : 26,
    mass: prefersReducedMotion ? 0.45 : 0.6,
  })
  const distance = useTransform(smoothProgress, (value) => value * pathLengthRef.current)

  useEffect(() => {
    const collectStops = () => {
      const nextStops: RouteStopPoint[] = []
      SECTION_IDS.forEach((id) => {
        const marker = document.querySelector<HTMLElement>(`[data-route-stop="${id}"]`)
        if (!marker) return
        const rect = marker.getBoundingClientRect()
        nextStops.push({
          id,
          x: rect.left + rect.width / 2,
          y: rect.top + window.scrollY + rect.height / 2,
        })
      })

      stopsRef.current = nextStops
      viewportHeightRef.current = window.innerHeight
      setViewportWidth(window.innerWidth)
      setDocHeight(document.documentElement.scrollHeight)
      const startAnchor = document.querySelector<HTMLElement>("[data-route-start='s']")
      const startPoint = startAnchor
        ? {
            x: startAnchor.getBoundingClientRect().left + startAnchor.getBoundingClientRect().width / 2,
            y: startAnchor.getBoundingClientRect().top + window.scrollY + startAnchor.getBoundingClientRect().height / 2,
          }
        : null
      setPathD(buildPathD(nextStops, startPoint))
      updateProgress(window.scrollY)
    }

    collectStops()
    const resizeObserver = new ResizeObserver(collectStops)
    resizeObserver.observe(document.body)
    window.addEventListener("resize", collectStops)

    const timerA = window.setTimeout(collectStops, 200)
    const timerB = window.setTimeout(collectStops, 800)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("resize", collectStops)
      window.clearTimeout(timerA)
      window.clearTimeout(timerB)
    }
  }, [dir, updateProgress])

  useEffect(() => {
    if (!pathRef.current) return
    const length = pathRef.current.getTotalLength()
    pathLengthRef.current = length
    setPathLengthState(length)
    updateActiveMarker(stopsRef.current, progress.get())
  }, [pathD])

  useEffect(() => {
    const pathNode = pathRef.current
    const totalLength = pathLengthRef.current
    if (!pathNode || !totalLength) return
    const point = pathNode.getPointAtLength(0)
    const ahead = pathNode.getPointAtLength(Math.min(totalLength, 2))
    const angle =
      (Math.atan2(ahead.y - point.y, ahead.x - point.x) * 180) / Math.PI + VEHICLE_HEADING_OFFSET
    const stableAngle = pickStableVehicleAngle(angle, lastAngleRef.current)
    vehicleX.set(point.x)
    vehicleY.set(point.y)
    lastAngleRef.current = stableAngle
    vehicleAngle.set(stableAngle)
  }, [pathLengthState, vehicleAngle, vehicleX, vehicleY])

  useMotionValueEvent(distance, "change", (value) => {
    const pathNode = pathRef.current
    const totalLength = pathLengthRef.current
    if (!pathNode || !totalLength) return

    const clampedLength = Math.max(0, Math.min(totalLength, value))
    const point = pathNode.getPointAtLength(clampedLength)
    const tangentDelta = compact ? 18 : 26
    const backLength = Math.max(0, clampedLength - tangentDelta)
    const frontLength = Math.min(totalLength, clampedLength + tangentDelta)
    const backPoint = pathNode.getPointAtLength(backLength)
    const frontPoint = pathNode.getPointAtLength(frontLength)
    const rawAngle =
      (Math.atan2(frontPoint.y - backPoint.y, frontPoint.x - backPoint.x) * 180) / Math.PI +
      VEHICLE_HEADING_OFFSET
    const stableAngle = pickStableVehicleAngle(rawAngle, lastAngleRef.current)

    vehicleX.set(point.x)
    vehicleY.set(point.y)
    lastAngleRef.current = stableAngle
    vehicleAngle.set(stableAngle)
  })

  useMotionValueEvent(smoothProgress, "change", (value) => {
    updateActiveMarker(stopsRef.current, value)
  })

  const compact = viewportWidth < 768
  const shouldRender = Boolean(pathD) && viewportWidth > 0 && docHeight > 0

  if (!shouldRender) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden" aria-hidden="true">
      <svg
        className="absolute inset-0"
        width={viewportWidth}
        height={docHeight}
        viewBox={`0 0 ${viewportWidth} ${docHeight}`}
        preserveAspectRatio="none"
      >
        <RoutePath
          pathRef={pathRef}
          pathD={pathD}
          pathLength={pathLengthState}
          progress={smoothProgress}
          compact={compact}
          prefersReducedMotion={prefersReducedMotion}
        />
      </svg>

      <RouteVehicle
        x={vehicleX}
        y={vehicleY}
        angle={vehicleAngle}
        compact={compact}
        prefersReducedMotion={prefersReducedMotion}
      />
    </div>
  )
}
