"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useLandingI18n } from "@/components/landing/landing-i18n"
import type { LucideIcon } from "lucide-react"
import {
  iconBadge,
  landingContainer,
  premiumCardBase,
  premiumCardHover,
  sectionDescription,
  sectionSpacing,
  sectionTitle,
} from "@/components/landing/styles"
import { ScrollReveal } from "@/components/landing/scroll-reveal"
import { RouteMarker } from "@/components/landing/scroll-route/route-marker"

export function PlatformOverviewSection() {
  const { content, dir } = useLandingI18n()
  const overview = content.overview
  const markerLaneClass =
    dir === "rtl"
      ? "lg:right-[4%]"
      : "lg:left-[4%]"
  const cardsLanePaddingClass =
    dir === "rtl"
      ? "lg:pr-24 xl:pr-28 lg:pl-8"
      : "lg:pl-24 xl:pl-28 lg:pr-8"

  return (
    <section id="overview" className={cn("relative", sectionSpacing)}>
      <RouteMarker stopId="overview" index={1} dir={dir} className={markerLaneClass} />
      <div className={cn(landingContainer, "relative z-10")}>
        <ScrollReveal className={cn("mx-auto -mt-4 mb-12 max-w-3xl sm:-mt-2 sm:mb-16 lg:mb-24", dir === "rtl" ? "text-right" : "text-left")}>
          <h2 className={sectionTitle}>{overview.title}</h2>
          <p className={sectionDescription}>
            {overview.description}
          </p>
        </ScrollReveal>

        <div className={cn("mx-auto mt-8 max-w-5xl sm:mt-12", cardsLanePaddingClass)}>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-2">
            {overview.cards.map((item: { title: string; description: string; icon: LucideIcon }, index: number) => {
              const Icon = item.icon
              return (
                <ScrollReveal key={item.title} delayMs={index * 70}>
                  <Card className={cn("h-full", premiumCardBase, premiumCardHover)}>
                  <CardHeader className={cn("space-y-4 pb-3", dir === "rtl" ? "text-right" : "text-left")}>
                    <div className={cn("mb-3 flex", dir === "rtl" ? "justify-end" : "justify-start")}>
                      <div className={iconBadge}>
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <CardTitle className="text-lg font-semibold tracking-tight">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className={cn("text-sm leading-7 text-muted-foreground", dir === "rtl" ? "text-right" : "text-left")}>
                    {item.description}
                  </CardContent>
                </Card>
                </ScrollReveal>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
