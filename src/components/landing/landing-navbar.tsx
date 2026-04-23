"use client"

import Link from "next/link"
import Image from "next/image"
import type { MouseEvent } from "react"
import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useLandingI18n } from "@/components/landing/landing-i18n"
import { landingContainer } from "@/components/landing/styles"
import { PremiumThemeToggle } from "@/components/landing/premium-theme-toggle"
import { useActiveSection } from "@/components/landing/use-active-section"
import { cn } from "@/lib/utils"

export function LandingNavbar() {
  const { content, toggleLanguage } = useLandingI18n()
  const nav = content.nav
  const { resolvedTheme, setTheme } = useTheme()
  const prefersReducedMotion = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  const sectionIds = nav.links.map((link: { href: string }) => link.href.replace("#", ""))
  const { activeSection, setActiveSection } = useActiveSection({
    sectionIds,
    headerOffset: 112,
    viewportAnchor: 0.42,
    hysteresisPx: 80,
  })

  const handleNavClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    const targetId = href.replace("#", "")
    const targetSection = document.getElementById(targetId)
    if (!targetSection) return

    event.preventDefault()
    setActiveSection(targetId)

    const targetY = targetSection.getBoundingClientRect().top + window.scrollY - 104
    window.scrollTo({
      top: Math.max(targetY, 0),
      behavior: prefersReducedMotion ? "auto" : "smooth",
    })
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted ? resolvedTheme === "dark" : false

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className={`${landingContainer} flex h-20 items-center justify-between`}>
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt={nav.logoAlt}
            width={168}
            height={56}
            className="h-14 w-auto object-contain saturate-110"
            priority
          />
        </Link>

        <nav className="hidden items-center md:flex">
          {nav.links.map((link: { href: string; label: string }) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(event) => handleNavClick(event, link.href)}
              className={cn(
                "relative inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-300",
                activeSection === link.href.replace("#", "")
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {activeSection === link.href.replace("#", "") ? (
                <motion.span
                  layoutId="landing-active-nav-indicator"
                  className="absolute inset-0 -z-10 rounded-xl border border-primary/70 bg-primary shadow-[0_12px_30px_-20px_hsl(var(--primary)/0.7)]"
                  transition={{
                    layout: {
                      duration: prefersReducedMotion ? 0.2 : 0.62,
                      ease: [0.22, 1, 0.36, 1],
                    },
                  }}
                  animate={
                    prefersReducedMotion
                      ? { scaleX: 1, opacity: 1 }
                      : {
                          scaleX: [1, 0.94, 1],
                          opacity: [0.92, 1, 1],
                        }
                  }
                />
              ) : null}
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <div className={cn("transition-opacity duration-200", mounted ? "opacity-100" : "opacity-0")}>
            <PremiumThemeToggle
              checked={isDark}
              onToggle={() => setTheme(isDark ? "light" : "dark")}
              label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            />
          </div>
          <Button
            onClick={toggleLanguage}
            className="h-10 rounded-xl border border-foreground/15 bg-white text-black hover:bg-slate-100 dark:border-border/70 dark:bg-background dark:text-foreground dark:hover:bg-accent"
          >
            {nav.switchLanguage}
          </Button>
          <Button asChild className="hidden h-10 rounded-xl bg-transparent text-black hover:bg-slate-100 dark:text-foreground dark:hover:bg-accent sm:inline-flex">
            <Link href="/login">{nav.login}</Link>
          </Button>
          <Button asChild className="h-10 rounded-xl">
            <Link href="/register">{nav.requestAccess}</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
