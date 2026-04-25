"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useReducedMotion, useTransform, useMotionValueEvent, useMotionValue, useSpring } from "framer-motion"
import { RoutePath } from "@/components/landing/scroll-route/route-path"
import { RouteVehicle } from "@/components/landing/scroll-route/route-vehicle"
import type { RouteDir, RouteStopPoint } from "@/components/landing/scroll-route/route-types"
import { useScrollProgress } from "@/components/landing/scroll-route/use-scroll-progress"

const SECTION_IDS = ["home", "overview", "features", "workflow", "stats", "cta"] as const
const VEHICLE_HEADING_OFFSET = 180
const HASH_SECTION_ALIASES: Record<string, (typeof SECTION_IDS)[number]> = {
  metrics: "stats",
}

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

function findClosestLengthOnPath(pathNode: SVGPathElement, totalLength: number, target: { x: number; y: number }) {
  if (totalLength <= 0) return 0
  const sampleCount = 220
  let bestLength = 0
  let bestDistance = Number.POSITIVE_INFINITY

  for (let i = 0; i <= sampleCount; i += 1) {
    const length = (i / sampleCount) * totalLength
    const point = pathNode.getPointAtLength(length)
    const dx = point.x - target.x
    const dy = point.y - target.y
    const distanceSq = dx * dx + dy * dy
    if (distanceSq < bestDistance) {
      bestDistance = distanceSq
      bestLength = length
    }
  }

  let low = Math.max(0, bestLength - totalLength / sampleCount)
  let high = Math.min(totalLength, bestLength + totalLength / sampleCount)
  for (let i = 0; i < 8; i += 1) {
    const left = low + (high - low) / 3
    const right = high - (high - low) / 3
    const leftPoint = pathNode.getPointAtLength(left)
    const rightPoint = pathNode.getPointAtLength(right)
    const leftDx = leftPoint.x - target.x
    const leftDy = leftPoint.y - target.y
    const rightDx = rightPoint.x - target.x
    const rightDy = rightPoint.y - target.y
    const leftDist = leftDx * leftDx + leftDy * leftDy
    const rightDist = rightDx * rightDx + rightDy * rightDy
    if (leftDist <= rightDist) high = right
    else low = left
  }

  return (low + high) / 2
}

function interpolateCheckpointProgress(
  stops: RouteStopPoint[],
  stopProgresses: number[],
  scrollY: number,
  viewportHeight: number,
) {
  if (stops.length < 2 || viewportHeight <= 0 || stopProgresses.length !== stops.length) return 0
  const centerY = scrollY + viewportHeight * 0.5
  const firstY = stops[0].y
  const lastY = stops[stops.length - 1].y

  if (centerY <= firstY) return stopProgresses[0] ?? 0
  if (centerY >= lastY) return stopProgresses[stops.length - 1] ?? 1

  for (let i = 0; i < stops.length - 1; i += 1) {
    const startY = stops[i].y
    const endY = stops[i + 1].y
    if (centerY >= startY && centerY <= endY) {
      const local = endY > startY ? (centerY - startY) / (endY - startY) : 0
      const startProgress = stopProgresses[i] ?? 0
      const endProgress = stopProgresses[i + 1] ?? startProgress
      return startProgress + (endProgress - startProgress) * local
    }
  }

  return stopProgresses[stops.length - 1] ?? 1
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
  const localizedStopsRef = useRef<RouteStopPoint[]>([])
  const stopProgressesRef = useRef<number[]>([])
  const markerLengthsRef = useRef<number[]>([])
  const markerStartLengthRef = useRef(0)
  const markerEndLengthRef = useRef(0)
  const routeTopOffsetRef = useRef(0)
  const viewportHeightRef = useRef(0)
  const lastAngleRef = useRef(0)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [docHeight, setDocHeight] = useState(0)
  const [routeTopOffset, setRouteTopOffset] = useState(0)
  const [pathD, setPathD] = useState("")
  const [pathLengthState, setPathLengthState] = useState(0)

  const vehicleX = useMotionValue(0)
  const vehicleY = useMotionValue(0)
  const vehicleAngle = useMotionValue(0)

  const computeProgress = useCallback((scrollY: number) => {
    return interpolateCheckpointProgress(
      stopsRef.current,
      stopProgressesRef.current,
      scrollY,
      viewportHeightRef.current,
    )
  }, [])

  const { progress, updateProgress } = useScrollProgress(computeProgress)
  const smoothProgress = useSpring(progress, {
    stiffness: prefersReducedMotion ? 280 : 160,
    damping: prefersReducedMotion ? 34 : 26,
    mass: prefersReducedMotion ? 0.45 : 0.6,
  })
  const distance = useTransform(smoothProgress, (value) => {
    const start = markerStartLengthRef.current
    const end = markerEndLengthRef.current
    const span = Math.max(0, end - start)
    return start + span * value
  })

  useEffect(() => {
    const collectStops = () => {
      const absoluteStops: RouteStopPoint[] = []
      SECTION_IDS.forEach((id) => {
        const marker = document.querySelector<HTMLElement>(`[data-route-stop="${id}"]`)
        if (!marker) return
        const rect = marker.getBoundingClientRect()
        absoluteStops.push({
          id,
          x: rect.left + rect.width / 2,
          y: rect.top + window.scrollY + rect.height / 2,
        })
      })

      stopsRef.current = absoluteStops
      viewportHeightRef.current = window.innerHeight
      setViewportWidth(window.innerWidth)
      const nextDocHeight = document.documentElement.scrollHeight
      setDocHeight(nextDocHeight)

      const navbar = document.querySelector<HTMLElement>("header.sticky")
      const headerHeight = navbar?.offsetHeight ?? 80
      const firstStopY = absoluteStops[0]?.y ?? headerHeight + 120
      const topSafe = headerHeight + 16
      const centeredTop = firstStopY - window.innerHeight * 0.45
      const nextTopOffset = Math.max(topSafe, Math.min(centeredTop, firstStopY - 40))

      routeTopOffsetRef.current = nextTopOffset
      setRouteTopOffset(nextTopOffset)

      const localizedStops = absoluteStops.map((stop) => ({
        ...stop,
        y: stop.y - nextTopOffset,
      }))
      localizedStopsRef.current = localizedStops

      setPathD(buildPathD(localizedStops, null))
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
    const localStops = localizedStopsRef.current
    if (localStops.length) {
      const markerLengths = localStops.map((stop) =>
        findClosestLengthOnPath(pathRef.current as SVGPathElement, length, { x: stop.x, y: stop.y }),
      )
      markerLengthsRef.current = markerLengths
      const startLength = markerLengths[0] ?? 0
      const endLength = markerLengths[markerLengths.length - 1] ?? length
      markerStartLengthRef.current = startLength
      markerEndLengthRef.current = endLength
      const span = Math.max(1, endLength - startLength)
      stopProgressesRef.current = markerLengths.map((markerLength) => (markerLength - startLength) / span)
    }
    updateActiveMarker(stopsRef.current, progress.get())
  }, [pathD, progress])

  useEffect(() => {
    const applyHashCheckpoint = () => {
      const hash = window.location.hash.replace("#", "")
      if (!hash) return
      const sectionId = HASH_SECTION_ALIASES[hash] ?? hash
      const stopIndex = SECTION_IDS.findIndex((id) => id === sectionId)
      if (stopIndex < 0) return
      const checkpoint = stopProgressesRef.current[stopIndex]
      if (typeof checkpoint !== "number") return
      progress.set(checkpoint)
      updateActiveMarker(stopsRef.current, checkpoint)
    }

    applyHashCheckpoint()
    window.addEventListener("hashchange", applyHashCheckpoint)
    return () => {
      window.removeEventListener("hashchange", applyHashCheckpoint)
    }
  }, [progress])

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
  const routeHeight = Math.max(0, docHeight - routeTopOffset)
  const shouldRender = Boolean(pathD) && viewportWidth > 0 && routeHeight > 0

  if (!shouldRender) return null

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-[1] overflow-hidden"
      style={{ top: routeTopOffset, height: routeHeight }}
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 z-[1]"
        width={viewportWidth}
        height={routeHeight}
        viewBox={`0 0 ${viewportWidth} ${routeHeight}`}
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
