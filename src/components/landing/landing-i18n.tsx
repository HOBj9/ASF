"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { landingContent, type LandingLang } from "@/components/landing/data"

type LandingI18nContextValue = {
  lang: LandingLang
  dir: "rtl" | "ltr"
  isReady: boolean
  toggleLanguage: () => void
  content: (typeof landingContent)[LandingLang]
}

const LandingI18nContext = createContext<LandingI18nContextValue | null>(null)

export function LandingI18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<LandingLang>("ar")
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const saved = window.localStorage.getItem("landing-lang")
    if (saved === "ar" || saved === "en") {
      setLang(saved)
    }
    setIsReady(true)
  }, [])

  const toggleLanguage = () => {
    setLang((prev) => {
      const next = prev === "ar" ? "en" : "ar"
      window.localStorage.setItem("landing-lang", next)
      return next
    })
  }

  const value = useMemo(
    () => ({
      lang,
      dir: (lang === "ar" ? "rtl" : "ltr") as const,
      isReady,
      toggleLanguage,
      content: landingContent[lang],
    }),
    [lang, isReady],
  )

  return <LandingI18nContext.Provider value={value}>{children}</LandingI18nContext.Provider>
}

export function useLandingI18n() {
  const context = useContext(LandingI18nContext)
  if (!context) {
    throw new Error("useLandingI18n must be used within LandingI18nProvider")
  }
  return context
}
