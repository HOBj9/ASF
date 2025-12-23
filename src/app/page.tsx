import type { Metadata } from "next"
import { Navbar } from "@/components/landing/navbar"
import { HeroSection } from "@/components/landing/hero-section"
import { AboutSection } from "@/components/landing/about-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { Footer } from "@/components/landing/footer"
import { WaveBackground } from "@/components/landing/wave-background"

export const metadata: Metadata = {
  title: "Next.js Starter Kit",
  description:
    "قالب Next.js جاهز للاستخدام مع نظام مصادقة وأدوار وصلاحيات متكامل",
}

export default function LandingPage() {
  return (
    <main className="min-h-screen relative">
      {/* Unified Wave Background with Blur - covers entire page */}
      <WaveBackground opacity="opacity-15 dark:opacity-8" />
      <div className="fixed inset-0 backdrop-blur-[2px] z-[1] pointer-events-none"></div>
      
      <div className="relative z-10">
        <Navbar />
        <HeroSection />
        <AboutSection />
        <FeaturesSection />
        <Footer />
      </div>
    </main>
  )
}
