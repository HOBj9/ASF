"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { useLandingI18n } from "@/components/landing/landing-i18n"
import { landingContainer } from "@/components/landing/styles"
import { ScrollReveal } from "@/components/landing/scroll-reveal"

export function Footer() {
  const currentYear = new Date().getFullYear()
  const { content, dir } = useLandingI18n()
  const footer = content.footer
  const links = content.nav.links

  return (
    <footer className="border-t border-border/60 bg-muted/20 py-10 sm:py-14">
      <div className={landingContainer}>
        <ScrollReveal className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className={cn("space-y-3", dir === "rtl" ? "text-right" : "text-left")}>
            <p className="text-lg font-semibold tracking-tight text-foreground">{footer.brand}</p>
            <p className="max-w-sm text-sm leading-7 text-muted-foreground">
              {footer.description}
            </p>
          </div>

          <div className={cn(dir === "rtl" ? "text-right" : "text-left")}>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/85">{footer.quickLinks}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {links.map((link: { href: string; label: string }) => (
                <li key={link.href}>
                  <a href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className={cn(dir === "rtl" ? "text-right" : "text-left")}>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/85">{footer.contact}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{footer.emailLabel}: info@alather.net</li>
              <li>{footer.phoneLabel}: +963 993 370 560</li>
              <li>
                <Link href="/login" className="transition-colors hover:text-foreground">
                  {footer.loginLink}
                </Link>
              </li>
            </ul>
          </div>
        </ScrollReveal>

        <ScrollReveal delayMs={120} className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 sm:mt-10 sm:flex-row">
          <p className="text-center text-sm text-muted-foreground sm:text-start">© {currentYear} {footer.brand}</p>
          <p className="text-center text-xs text-muted-foreground sm:text-start">{footer.rights}</p>
        </ScrollReveal>
      </div>
    </footer>
  )
}
