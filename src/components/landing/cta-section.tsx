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
      ? "lg:right-[5%]"
      : "lg:left-[5%]"
  const cardAlignmentClass = dir === "rtl" ? "mr-auto ml-0" : "ml-auto mr-0"

  return (
    <section id="cta" className={cn("relative", sectionSpacing)}>
      <RouteMarker stopId="cta" index={5} dir={dir} className={markerLaneClass} />
      <div className={cn(landingContainer, "relative z-10")}>
        <ScrollReveal>
          <div className={cn("relative max-w-4xl overflow-hidden rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-8", cardAlignmentClass, dir === "rtl" ? "text-right" : "text-left")}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.10),transparent_35%)]" />
          <div className="relative">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">{cta.title}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
            {cta.description}
          </p>
          <div className={cn("mt-6 flex flex-col gap-3 sm:flex-row", dir === "rtl" ? "justify-end" : "justify-start")}>
            <Button size="lg" asChild className="h-11 w-full rounded-xl px-6 sm:w-auto">
              <Link href="/register">{cta.primary}</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-11 w-full rounded-xl border-border/70 px-6 sm:w-auto">
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
