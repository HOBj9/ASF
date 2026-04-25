"use client"

import { cn } from "@/lib/utils"
import { useLandingI18n } from "@/components/landing/landing-i18n"
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

export function StatsSection() {
  const { content, dir } = useLandingI18n()
  const stats = content.stats

  return (
    <section id="stats" className={cn("relative border-y border-border/60 bg-muted/30", sectionSpacing)}>
      <RouteMarker stopId="stats" index={4} dir={dir} />
      <div className={cn(landingContainer, "relative z-10")}>
        <ScrollReveal className={cn("mx-auto mb-8 max-w-3xl", dir === "rtl" ? "text-right" : "text-left")}>
          <h2 className={sectionTitle}>{stats.title}</h2>
          <p className={sectionDescription}>
            {stats.description}
          </p>
        </ScrollReveal>

        <div className="mx-auto max-w-5xl lg:px-20 xl:px-24">
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-2">
            {stats.items.map((item: { label: string; value: string }, index: number) => (
              <ScrollReveal key={item.label} delayMs={index * 70}>
                <div
                  className={cn(
                    premiumCardBase,
                    premiumCardHover,
                    "bg-background/95 p-5 sm:p-6",
                    dir === "rtl" ? "text-right" : "text-left",
                  )}
                >
                  <p className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{item.value}</p>
                  <p className="mt-3 text-sm font-medium text-muted-foreground">{item.label}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
