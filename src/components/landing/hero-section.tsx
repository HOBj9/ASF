"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLandingI18n } from "@/components/landing/landing-i18n"
import {
  landingContainer,
  sectionSpacing,
} from "@/components/landing/styles"
import { ScrollReveal } from "@/components/landing/scroll-reveal"
import { RouteMarker } from "@/components/landing/scroll-route/route-marker"

export function HeroSection() {
  const { content, dir, lang } = useLandingI18n()
  const hero = content.hero
  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight

  return (
    <section id="home" className={cn("relative overflow-hidden border-b border-border/60", sectionSpacing)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.10),transparent_35%),radial-gradient(circle_at_85%_10%,hsl(var(--primary)/0.07),transparent_30%)]" />
      <RouteMarker stopId="home" index={0} dir={dir} className="top-[64%] sm:top-[66%] lg:top-[58%]" />
      <div className={cn(landingContainer, "relative z-10 grid gap-8 lg:grid-cols-2 lg:gap-14")}>
        <ScrollReveal className={cn("space-y-6", dir === "rtl" ? "text-right" : "text-left")}>
          <p className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            {hero.badge}
          </p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {lang === "ar" ? (
              <span className="block space-y-2 sm:space-y-3">
                <span className="block py-0.5">{hero.titleParts[0]}</span>
                <span className="block py-0.5">{hero.titleParts[1]}</span>
                <span className="block py-0.5">{hero.titleParts[2]}</span>
              </span>
            ) : (
              <>
                {hero.titleParts[0]} {hero.titleParts[1]} {hero.titleParts[2]}
              </>
            )}
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8 lg:text-lg">
            {hero.description}
          </p>
          <div className={cn("flex w-full flex-col gap-3 sm:w-fit sm:flex-row", dir === "rtl" ? "ml-auto" : "mr-auto")}>
            <Button size="lg" asChild className="h-11 w-full rounded-xl px-6 sm:w-auto">
              <Link href="/register" className="inline-flex items-center gap-2">
                {hero.primaryCta}
                <ArrowIcon className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-11 w-full rounded-xl border-border/70 px-6 sm:w-auto">
              <Link href="/login">{hero.secondaryCta}</Link>
            </Button>
          </div>
        </ScrollReveal>

        <div className="relative hidden min-h-[260px] sm:min-h-[320px] lg:block lg:min-h-[360px]" aria-hidden="true" />
      </div>
    </section>
  )
}
