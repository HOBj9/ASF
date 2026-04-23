"use client"

import { LandingNavbar } from "@/components/landing/landing-navbar"
import { HeroSection } from "@/components/landing/hero-section"
import { PlatformOverviewSection } from "@/components/landing/platform-overview-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { HowItWorksSection } from "@/components/landing/how-it-works-section"
import { StatsSection } from "@/components/landing/stats-section"
import { CtaSection } from "@/components/landing/cta-section"
import { Footer } from "@/components/landing/footer"
import { LandingRouteSystem } from "@/components/landing/scroll-route/landing-route-system"
import { LandingI18nProvider, useLandingI18n } from "@/components/landing/landing-i18n"

function LandingContent() {
  const { dir, lang, isReady } = useLandingI18n()

  if (!isReady) {
    return <main className="min-h-screen bg-background" aria-hidden="true" />
  }

  return (
    <main
      className="relative min-h-screen overflow-x-clip font-sans bg-[linear-gradient(to_bottom,hsl(var(--background)),hsl(var(--background))_35%,hsl(var(--muted)/0.25)_100%)]"
      dir={dir}
      lang={lang}
    >
      <LandingRouteSystem dir={dir} />
      <div className="relative z-[10]">
        <LandingNavbar />
        <HeroSection />
        <PlatformOverviewSection />
        <FeaturesSection />
        <HowItWorksSection />
        <StatsSection />
        <CtaSection />
        <Footer />
      </div>
    </main>
  )
}

export function LandingPageShell() {
  return (
    <LandingI18nProvider>
      <LandingContent />
    </LandingI18nProvider>
  )
}
