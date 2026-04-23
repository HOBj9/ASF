"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useLandingI18n } from "@/components/landing/landing-i18n"
import { landingContainer, sectionSpacing } from "@/components/landing/styles"
import { ScrollReveal } from "@/components/landing/scroll-reveal"
import { RouteMarker } from "@/components/landing/scroll-route/route-marker"

export function CtaSection() {
  const { content, dir } = useLandingI18n()
  const cta = content.cta
  const markerLaneClass =
    dir === "rtl"
      ? "right-[3%] md:right-[4%] lg:right-[5%]"
      : "left-[3%] md:left-[4%] lg:left-[5%]"
  const cardAlignmentClass = dir === "rtl" ? "mr-auto ml-0" : "ml-auto mr-0"

  return (
    <section id="cta" className={cn("relative", sectionSpacing)}>
      <RouteMarker stopId="cta" index={5} dir={dir} className={markerLaneClass} />
      <div className={landingContainer}>
        <ScrollReveal>
          <div className={cn("relative max-w-4xl overflow-hidden rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-8", cardAlignmentClass, dir === "rtl" ? "text-right" : "text-left")}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.10),transparent_35%)]" />
          <div className="relative">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{cta.title}</h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
            {cta.description}
          </p>
          <div className={cn("mt-6 flex flex-col gap-3 sm:flex-row", dir === "rtl" ? "justify-end" : "justify-start")}>
            <Button size="lg" asChild className="h-11 rounded-xl px-6">
              <Link href="/register">{cta.primary}</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-11 rounded-xl border-border/70 px-6">
              <Link href="/login">{cta.secondary}</Link>
            </Button>
          </div>
          </div>
        </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
