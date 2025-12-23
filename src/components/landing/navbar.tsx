"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { LayoutDashboard } from "lucide-react"

export function Navbar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState("")
  const isAuthenticated = status === "authenticated" && session

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
      
      // Determine active section based on scroll position
      const sections = ["about", "features", "benefits", "contact"]
      const scrollPosition = window.scrollY + 100
      
      for (const section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section)
            break
          }
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    handleScroll() // Check on mount
    
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
      setActiveSection(id)
    }
  }

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      scrolled 
        ? "bg-background/95 backdrop-blur-xl shadow-layered" 
        : "bg-background/80 backdrop-blur-md"
    )}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 md:h-24">
          {/* Logo - Balanced and Larger */}
          <Link href="/" className="flex items-center justify-center flex-1 group">
            <div className="h-[100px] w-[100px] lg:h-[150px] lg:w-[150px] flex items-center justify-center group-hover:scale-105 transition-transform duration-300 relative">
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <Image 
                src="/logo.png" 
                alt="Logo" 
                width={200}
                height={200}
                className="object-contain w-full h-full brightness-110 contrast-110 drop-shadow-lg relative z-10 group-hover:drop-shadow-glow transition-all duration-300"
                priority
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
            {[
              { id: "about", label: "من نحن" },
              { id: "features", label: "الميزات" },
              { id: "benefits", label: "الفوائد" },
              { id: "contact", label: "تواصل معنا" },
            ].map((item) => {
              const isActive = activeSection === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={cn(
                    "relative text-sm font-semibold transition-all duration-300 px-2 py-1 group",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                  <span
                    className={cn(
                      "absolute bottom-0 right-0 left-0 h-0.5 bg-gradient-to-r from-primary to-primary-light transition-all duration-300",
                      isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0 group-hover:opacity-50 group-hover:scale-x-100"
                    )}
                  />
                </button>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-1 justify-end">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <div className="hidden sm:flex items-center gap-2">
                  <Button 
                    asChild
                    className="bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-primary shadow-glow hover:shadow-glow-lg transition-all"
                  >
                    <Link href="/dashboard" className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      لوحة التحكم
                    </Link>
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="sm:hidden"
                  asChild
                >
                  <Link href="/dashboard">
                    <span className="sr-only">لوحة التحكم</span>
                    <LayoutDashboard className="h-5 w-5" />
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <div className="hidden sm:flex items-center gap-2">
                  <Button
                    variant="outline"
                    asChild
                    className="hidden lg:flex border-primary/30 hover:border-primary/60 hover:bg-primary/10 transition-all"
                  >
                    <Link href="/login">تسجيل الدخول</Link>
                  </Button>
                  <Button 
                    asChild
                    className="bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-primary shadow-glow hover:shadow-glow-lg transition-all"
                  >
                    <Link href="/register">ابدأ الآن</Link>
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="sm:hidden"
                  asChild
                >
                  <Link href="/login">
                    <span className="sr-only">تسجيل الدخول</span>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
