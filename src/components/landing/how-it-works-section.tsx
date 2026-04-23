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

export function HowItWorksSection() {
  const { content, dir } = useLandingI18n()
  const workflow = content.workflow
  const markerLaneClass =
    dir === "rtl"
      ? "right-[2%] md:right-[3%] lg:right-[4%]"
      : "left-[2%] md:left-[3%] lg:left-[4%]"

  return (
    <section id="workflow" className={cn("relative", sectionSpacing)}>
      <RouteMarker stopId="workflow" index={3} dir={dir} className={markerLaneClass} />
      <div className={landingContainer}>
        <ScrollReveal className={cn("mx-auto mb-10 max-w-3xl", dir === "rtl" ? "text-right" : "text-left")}>
          <h2 className={sectionTitle}>{workflow.title}</h2>
          <p className={sectionDescription}>
            {workflow.description}
          </p>
        </ScrollReveal>

        <div className="mx-auto max-w-5xl lg:px-20 xl:px-24">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-2">
            {workflow.steps.map((step: { title: string; description: string }, index: number) => (
              <ScrollReveal key={step.title} delayMs={index * 80}>
                <div
                  className={cn(
                    premiumCardBase,
                    premiumCardHover,
                    "relative overflow-hidden p-6",
                    dir === "rtl" ? "text-right" : "text-left",
                  )}
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/70 to-primary/20" />
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary/90">
                    {workflow.stepLabel} {index + 1}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight text-foreground">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
