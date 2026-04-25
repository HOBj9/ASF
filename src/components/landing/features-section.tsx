"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion, useInView, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useLandingI18n } from "@/components/landing/landing-i18n"
import type { LucideIcon } from "lucide-react"
import {
  landingContainer,
  premiumCardBase,
  premiumCardHover,
  sectionDescription,
  sectionSpacing,
  sectionTitle,
} from "@/components/landing/styles"
import { ScrollReveal } from "@/components/landing/scroll-reveal"
import { RouteMarker } from "@/components/landing/scroll-route/route-marker"

const LINE_STEP = 240
const ICON_DELAY = 70
const CARD_DELAY = 90
const BETWEEN_ITEMS = 70
const REVEAL_EASE = [0.22, 1, 0.36, 1] as const

type FeatureCard = {
  title: string
  description: string
  icon: LucideIcon
}

function buildFallbackStopPoints(length: number) {
  if (length <= 1) return [1]
  return Array.from({ length }, (_, index) => (index + 1) / length)
}

export function FeaturesSection() {
  const { content, dir } = useLandingI18n()
  const isRTL = dir === "rtl"
  const features = content.features as { title: string; description: string; cards: FeatureCard[] }
  const cards = useMemo(() => features.cards, [features.cards])
  const cardCount = cards.length
  const prefersReducedMotion = useReducedMotion()

  const sectionRef = useRef<HTMLElement | null>(null)
  const desktopLineHostRef = useRef<HTMLDivElement | null>(null)
  const desktopIconRefs = useRef<Array<HTMLDivElement | null>>([])
  const mobileIconRefs = useRef<Array<HTMLDivElement | null>>([])
  const hasStartedRef = useRef(false)
  const timeoutIdsRef = useRef<number[]>([])

  const [isDesktop, setIsDesktop] = useState(false)
  const [lineProgress, setLineProgress] = useState(0)
  const [lineVisible, setLineVisible] = useState(false)
  const [stopPoints, setStopPoints] = useState<number[]>([])
  const [iconVisible, setIconVisible] = useState<boolean[]>(() => cards.map(() => false))
  const [cardVisible, setCardVisible] = useState<boolean[]>(() => cards.map(() => false))
  const markerLaneClass = isRTL
    ? "!left-auto !right-[8%] md:!right-[11%] lg:!right-[13%]"
    : "!right-auto !left-[8%] md:!left-[11%] lg:!left-[13%]"
  const mobileTimelineGridCols = isRTL
    ? "grid-cols-[1fr_64px] sm:grid-cols-[1fr_72px]"
    : "grid-cols-[64px_1fr] sm:grid-cols-[72px_1fr]"

  const inView = useInView(sectionRef, { once: true, amount: 0.35 })

  useEffect(() => {
    const updateLayout = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }

    updateLayout()
    window.addEventListener("resize", updateLayout)
    return () => window.removeEventListener("resize", updateLayout)
  }, [])

  useEffect(() => {
    setIconVisible(Array.from({ length: cardCount }, () => false))
    setCardVisible(Array.from({ length: cardCount }, () => false))
    setLineProgress(0)
    setLineVisible(false)
    hasStartedRef.current = false
  }, [cardCount])

  useEffect(() => {
    const calculateStopPoints = () => {
      const iconRefs = isDesktop ? desktopIconRefs.current : mobileIconRefs.current
      if (isDesktop) {
        const lineHost = desktopLineHostRef.current
        if (!lineHost) {
          setStopPoints(buildFallbackStopPoints(cardCount))
          return
        }

        const hostRect = lineHost.getBoundingClientRect()
        const hostSize = hostRect.width
        if (hostSize <= 0) {
          setStopPoints(buildFallbackStopPoints(cardCount))
          return
        }

        const nextStops = Array.from({ length: cardCount }, (_, index) => {
          const iconEl = iconRefs[index]
          if (!iconEl) return 0
          const iconRect = iconEl.getBoundingClientRect()
          const iconCenter = iconRect.left + iconRect.width / 2 - hostRect.left
          return Math.max(0, Math.min(1, iconCenter / hostSize))
        })

        const hasMeasuredPoints = nextStops.some((point) => point > 0)
        setStopPoints(hasMeasuredPoints ? nextStops : buildFallbackStopPoints(cardCount))
        return
      }

      const iconCenters = iconRefs
        .map((iconEl) => {
          if (!iconEl) return null
          const rect = iconEl.getBoundingClientRect()
          return rect.top + rect.height / 2
        })
        .filter((value): value is number => typeof value === "number")

      if (iconCenters.length !== cardCount) {
        setStopPoints(buildFallbackStopPoints(cardCount))
        return
      }

      const firstCenter = iconCenters[0]
      const lastCenter = iconCenters[iconCenters.length - 1]
      const span = lastCenter - firstCenter

      const nextStops =
        span > 1
          ? iconCenters.map((center) => Math.max(0, Math.min(1, (center - firstCenter) / span)))
          : buildFallbackStopPoints(cardCount)

      const hasMeasuredPoints = nextStops.some((point) => point > 0)
      setStopPoints(hasMeasuredPoints ? nextStops : buildFallbackStopPoints(cardCount))
    }

    calculateStopPoints()
    const rafId = window.requestAnimationFrame(calculateStopPoints)
    const timeoutId = window.setTimeout(calculateStopPoints, 100)
    window.addEventListener("resize", calculateStopPoints)
    return () => {
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(timeoutId)
      window.removeEventListener("resize", calculateStopPoints)
    }
  }, [cardCount, isDesktop])

  useEffect(() => {
    if (!inView || hasStartedRef.current || stopPoints.length !== cardCount) return

    hasStartedRef.current = true
    timeoutIdsRef.current.forEach((id) => window.clearTimeout(id))
    timeoutIdsRef.current = []

    timeoutIdsRef.current.push(
      window.setTimeout(() => {
        setLineVisible(true)
      }, 60),
    )

    for (let index = 0; index < cardCount; index += 1) {
      const itemStart = index * (LINE_STEP + CARD_DELAY + BETWEEN_ITEMS)

      timeoutIdsRef.current.push(
        window.setTimeout(() => {
          setLineProgress(stopPoints[index] ?? 0)
        }, itemStart),
      )

      timeoutIdsRef.current.push(
        window.setTimeout(() => {
          setIconVisible((prev) => prev.map((item, itemIndex) => (itemIndex === index ? true : item)))
        }, itemStart + LINE_STEP + ICON_DELAY),
      )

      timeoutIdsRef.current.push(
        window.setTimeout(() => {
          setCardVisible((prev) => prev.map((item, itemIndex) => (itemIndex === index ? true : item)))
        }, itemStart + LINE_STEP + CARD_DELAY),
      )
    }

    return () => {
      timeoutIdsRef.current.forEach((id) => window.clearTimeout(id))
      timeoutIdsRef.current = []
    }
  }, [cardCount, inView, stopPoints])

  const progressTransition = {
    duration: prefersReducedMotion ? 0.12 : 0.24,
    ease: REVEAL_EASE,
  }

  return (
    <section
      ref={sectionRef}
      id="features"
      className={cn("relative border-y border-border/60 bg-muted/30", sectionSpacing)}
    >
      <RouteMarker stopId="features" index={2} dir={dir} className={markerLaneClass} />
      <div className={cn(landingContainer, "relative z-10")}>
        <ScrollReveal className={cn("mx-auto mb-8 max-w-3xl sm:mb-10", isRTL ? "text-right" : "text-left")}>
          <h2 className={sectionTitle}>{features.title}</h2>
          <p className={sectionDescription}>
            {features.description}
          </p>
        </ScrollReveal>

        {isDesktop ? (
          <div className="relative hidden lg:block">
            <div
              ref={desktopLineHostRef}
              className="absolute inset-x-10 top-1/2 h-px -translate-y-1/2 bg-border/70"
            >
              <motion.div
                className="h-full origin-left bg-primary"
                initial={false}
                animate={{ scaleX: lineProgress, opacity: lineVisible ? 1 : 0 }}
                transition={progressTransition}
              />
            </div>

            <div className="grid grid-cols-7 gap-4">
              {cards.map((feature, index) => {
                const Icon = feature.icon
                const isTop = index % 2 === 0
                const cardIsVisible = cardVisible[index]
                const iconIsVisible = iconVisible[index]

                return (
                  <div key={feature.title} className="relative min-h-[350px]">
                    <motion.div
                      ref={(el) => {
                        desktopIconRefs.current[index] = el
                      }}
                      className="absolute left-1/2 top-1/2 z-20 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-primary/35 bg-background shadow-[0_8px_20px_-14px_hsl(var(--primary)/0.65)]"
                      initial={false}
                      animate={{
                        opacity: iconIsVisible ? 1 : 0.1,
                        scale: iconIsVisible ? 1 : 0.7,
                      }}
                      transition={{
                        duration: prefersReducedMotion ? 0.08 : 0.14,
                        ease: REVEAL_EASE,
                      }}
                    >
                      <Icon className="h-4 w-4 text-primary" />
                    </motion.div>

                    <motion.div
                      className={cn(
                        "absolute left-1/2 w-[220px] -translate-x-1/2",
                        isTop ? "bottom-[calc(50%+84px)] origin-bottom" : "top-[calc(50%+84px)] origin-top",
                      )}
                      initial={false}
                      animate={{
                        opacity: cardIsVisible ? 1 : 0,
                        y: cardIsVisible ? 0 : isTop ? -20 : 20,
                        scale: cardIsVisible ? 1 : 0.96,
                      }}
                      transition={{
                        duration: prefersReducedMotion ? 0.1 : 0.16,
                        ease: REVEAL_EASE,
                      }}
                    >
                      <div className={cn("h-full bg-card/98 backdrop-blur-[1px]", premiumCardBase, premiumCardHover, "p-5")}>
                        <h3 className={cn("text-base font-semibold tracking-tight text-foreground", dir === "rtl" ? "text-right" : "text-left")}>
                          {feature.title}
                        </h3>
                        <p className={cn("mt-3 text-sm leading-7 text-muted-foreground", dir === "rtl" ? "text-right" : "text-left")}>
                          {feature.description}
                        </p>
                      </div>
                    </motion.div>

                    <motion.div
                      className={cn(
                        "absolute left-1/2 w-px -translate-x-1/2 bg-border/70",
                        isTop ? "top-[50%] h-[84px] -translate-y-full" : "top-1/2 h-[84px]",
                      )}
                      initial={false}
                      animate={{ opacity: cardIsVisible ? 1 : 0 }}
                      transition={{ duration: prefersReducedMotion ? 0.08 : 0.14 }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="relative lg:hidden">
            <div className="space-y-5">
              {cards.map((feature, index) => {
                const Icon = feature.icon
                const isTopPattern = index % 2 === 0
                const cardIsVisible = cardVisible[index]
                const iconIsVisible = iconVisible[index]

                return (
                  <div key={feature.title} className="relative min-h-[132px]">
                    <div
                      className={cn("grid min-h-[132px] items-stretch gap-3 sm:gap-4", mobileTimelineGridCols)}
                    >
                      <div className={cn("relative", isRTL ? "order-2" : "order-1")}>
                        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/70">
                          <motion.div
                            className="h-full w-full origin-top bg-primary"
                            initial={false}
                            animate={{ scaleY: lineProgress, opacity: lineVisible ? 1 : 0 }}
                            transition={progressTransition}
                          />
                        </div>

                        <motion.div
                          ref={(el) => {
                            mobileIconRefs.current[index] = el
                          }}
                          className="absolute left-1/2 top-1/2 z-20 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-primary/35 bg-background shadow-[0_8px_18px_-14px_hsl(var(--primary)/0.65)]"
                          initial={false}
                          animate={{
                            opacity: iconIsVisible ? 1 : 0.1,
                            scale: iconIsVisible ? 1 : 0.7,
                          }}
                          transition={{
                            duration: prefersReducedMotion ? 0.08 : 0.14,
                            ease: REVEAL_EASE,
                          }}
                        >
                          <Icon className="h-3.5 w-3.5 text-primary" />
                        </motion.div>
                      </div>

                      <motion.div
                        className={cn(
                          "bg-card/98 p-5 backdrop-blur-[1px]",
                          premiumCardBase,
                          premiumCardHover,
                          isTopPattern ? "origin-bottom" : "origin-top",
                          isRTL ? "order-1" : "order-2",
                        )}
                        initial={false}
                        animate={{
                          opacity: cardIsVisible ? 1 : 0,
                          y: cardIsVisible ? 0 : isTopPattern ? -20 : 20,
                          scale: cardIsVisible ? 1 : 0.96,
                        }}
                        transition={{
                          duration: prefersReducedMotion ? 0.1 : 0.16,
                          ease: REVEAL_EASE,
                        }}
                      >
                        <h3 className={cn("text-base font-semibold tracking-tight text-foreground", isRTL ? "text-right" : "text-left")}>
                          {feature.title}
                        </h3>
                        <p className={cn("mt-3 text-sm leading-7 text-muted-foreground", isRTL ? "text-right" : "text-left")}>
                          {feature.description}
                        </p>
                      </motion.div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
