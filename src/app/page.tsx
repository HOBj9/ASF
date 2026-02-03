import type { Metadata } from "next"
import { Navbar } from "@/components/landing/navbar"
import { HeroSection } from "@/components/landing/hero-section"
import { AboutSection } from "@/components/landing/about-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { BenefitsSection } from "@/components/landing/benefits-section"
import { Footer } from "@/components/landing/footer"
import { WaveBackground } from "@/components/landing/wave-background"

export const metadata: Metadata = {
  title: "منصة إدارة الفروع والمركبات والنقاط",
  description:
    "منصة تشغيل موحدة للمؤسسات وفروعها لإدارة المركبات والسائقين والنقاط والخطوط والتقارير التشغيلية.",
}

export default function LandingPage() {
  return (
    <main className="min-h-screen relative">
      <WaveBackground opacity="opacity-15 dark:opacity-8" />
      <div className="fixed inset-0 backdrop-blur-[2px] z-[1] pointer-events-none"></div>

      <div className="relative z-10">
        <Navbar />
        <HeroSection />
        <AboutSection />
        <FeaturesSection />
        <BenefitsSection />
        <Footer />
      </div>
    </main>
  )
}
