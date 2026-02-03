"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Building2,
  MapPinned,
  Route,
  Truck,
  LayoutDashboard,
} from "lucide-react"

const highlights = [
  {
    icon: Building2,
    title: "إدارة مؤسسة وفروع",
    description:
      "تعريف المؤسسة، إنشاء الفروع، وتوحيد الإعدادات والتسميات على جميع الفروع.",
  },
  {
    icon: Truck,
    title: "تشغيل ميداني متكامل",
    description: "إدارة المركبات والسائقين وربطهما بالخطوط ونقاط الخدمة داخل كل فرع.",
  },
  {
    icon: MapPinned,
    title: "خرائط وتتبّع حي",
    description: "عرض حي للمركبات والنقاط والمناطق على الخريطة مع واجهة تفاعلية مباشرة.",
  },
  {
    icon: Route,
    title: "تقارير تنفيذية",
    description: "تقارير يومية وأسبوعية وشهرية مع تصدير CSV وExcel وفق الأعمدة المطلوبة.",
  },
]

export function HeroSection() {
  const { data: session, status } = useSession()
  const isAuthenticated = status === "authenticated" && session

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 md:pt-32 lg:pt-36">
      <div className="absolute inset-0 z-[2] opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-enhanced"></div>
        <div
          className="absolute bottom-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-enhanced"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold mb-6 leading-tight animate-fade-in-up">
            <span className="text-gradient-vibrant">منصة تشغيل ذكية للمؤسسات وفروعها</span>
          </h1>

          <p
            className="text-lg md:text-xl lg:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed animate-fade-in-up font-medium"
            style={{ animationDelay: "0.2s" }}
          >
            نظام موحّد لإدارة الفروع والمركبات والسائقين والنقاط والخطوط، مع تتبّع حي
            ولوحات مؤشرات وتقارير تشغيلية قابلة للتصدير.
          </p>

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
                    الانتقال إلى لوحة التحكم
                    <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                  </span>
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
                    ابدأ التشغيل
                    <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="text-lg px-10 py-7 h-auto border-2 border-primary/50 hover:border-primary bg-transparent hover:bg-primary/10 backdrop-blur-sm transition-all duration-300 hover:scale-105"
                >
                  <Link href="/login">تسجيل الدخول</Link>
                </Button>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-10">
            {highlights.map((item, index) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className="p-5 rounded-xl glass-card transition-all hover-lift shadow-layered hover:shadow-layered-lg animate-fade-in-up text-right"
                  style={{ animationDelay: `${0.5 + index * 0.1}s` }}
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
