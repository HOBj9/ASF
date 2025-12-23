"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Shield, Users, KeyRound, ChevronDown, LayoutDashboard } from "lucide-react"

export function HeroSection() {
  const { data: session, status } = useSession()
  const isAuthenticated = status === "authenticated" && session

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 md:pt-32 lg:pt-36">
      {/* Subtle Background Overlay - Unified with other sections */}
      <div className="absolute inset-0 z-[2] opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-enhanced"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-enhanced" style={{ animationDelay: "2s" }}></div>
      </div>

      {/* Content Layer */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Heading with Gradient Text */}
          <h1 
            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold mb-6 leading-tight animate-fade-in-up" 
            style={{ wordSpacing: "0.2em", letterSpacing: "0.05em" }}
          >
            <span className="text-gradient-vibrant" style={{ wordSpacing: "0.2em", letterSpacing: "0.05em" }}>
              Next.js Starter Kit
            </span>
          </h1>

          {/* Subheading */}
          <p 
            className="text-lg md:text-xl lg:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed animate-fade-in-up font-medium" 
            style={{ animationDelay: "0.2s", wordSpacing: "0.15em", letterSpacing: "0.02em" }}
          >
            قالب جاهز للاستخدام مع نظام مصادقة كامل ونظام أدوار وصلاحيات مرن.
            ابدأ مشروعك بسرعة وكفاءة.
          </p>

          {/* Enhanced CTA Buttons */}
          <div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up" 
            style={{ animationDelay: "0.4s" }}
          >
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="text-lg px-10 py-7 h-auto group relative overflow-hidden bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-primary transition-all duration-300 shadow-glow hover:shadow-glow-lg hover:scale-105 border-0"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <LayoutDashboard className="h-5 w-5" />
                    لوحة التحكم
                    <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                </Button>
              </Link>
            ) : (
              <>
                <Button
                  size="lg"
                  asChild
                  className="text-lg px-10 py-7 h-auto group relative overflow-hidden bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-primary transition-all duration-300 shadow-glow hover:shadow-glow-lg hover:scale-105 border-0"
                >
                  <Link href="/register" className="flex items-center gap-2">
                    ابدأ الآن
                    <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="text-lg px-10 py-7 h-auto group relative overflow-hidden border-2 border-primary/50 hover:border-primary bg-transparent hover:bg-primary/10 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-glow"
                >
                  <Link href="/login" className="flex items-center gap-2">
                    تسجيل الدخول
                    <ChevronDown className="h-5 w-5 group-hover:translate-y-1 transition-transform" />
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Enhanced Features Grid */}
          <div 
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mt-20 relative"
          >
            <div 
              className="flex flex-col items-center p-6 rounded-xl glass-card transition-all hover-lift shadow-layered hover:shadow-layered-lg animate-fade-in-up group"
              style={{ animationDelay: "0.6s" }}
            >
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform group-hover:animate-glow-pulse">
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground" style={{ wordSpacing: "0.3em", letterSpacing: "0.05em" }}>مصادقة آمنة</span>
            </div>
            <div 
              className="flex flex-col items-center p-6 rounded-xl glass-card transition-all hover-lift shadow-layered hover:shadow-layered-lg animate-fade-in-up group"
              style={{ animationDelay: "0.7s" }}
            >
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform group-hover:animate-glow-pulse">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground" style={{ wordSpacing: "0.3em", letterSpacing: "0.05em" }}>إدارة المستخدمين</span>
            </div>
            <div 
              className="flex flex-col items-center p-6 rounded-xl glass-card transition-all hover-lift shadow-layered hover:shadow-layered-lg animate-fade-in-up group"
              style={{ animationDelay: "0.8s" }}
            >
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform group-hover:animate-glow-pulse">
                <KeyRound className="w-7 h-7 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground" style={{ wordSpacing: "0.3em", letterSpacing: "0.05em" }}>الأدوار والصلاحيات</span>
            </div>
            <div 
              className="flex flex-col items-center p-6 rounded-xl glass-card transition-all hover-lift shadow-layered hover:shadow-layered-lg animate-fade-in-up group"
              style={{ animationDelay: "0.9s" }}
            >
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform group-hover:animate-glow-pulse">
                <LayoutDashboard className="w-7 h-7 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground" style={{ wordSpacing: "0.3em", letterSpacing: "0.05em" }}>لوحة تحكم</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
