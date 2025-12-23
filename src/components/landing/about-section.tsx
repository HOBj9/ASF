"use client"

import { Code, Rocket, Heart } from "lucide-react"
import { Card } from "@/components/ui/card"

export function AboutSection() {
  return (
    <section id="about" className="py-20 md:py-28 bg-transparent relative overflow-hidden">
      <div className="absolute inset-0 z-[2] opacity-20">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-enhanced" style={{ animationDelay: "1s" }}></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-enhanced" style={{ animationDelay: "3s" }}></div>
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4" style={{ wordSpacing: "0.2em", letterSpacing: "0.05em" }}>
              <span className="text-gradient-primary">حول المشروع</span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium" style={{ wordSpacing: "0.15em", letterSpacing: "0.02em" }}>
              قالب Next.js جاهز للاستخدام مع نظام مصادقة وأدوار وصلاحيات متكامل
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <h3 className="text-2xl font-bold text-foreground mb-4" style={{ wordSpacing: "0.15em" }}>
                ما هو هذا المشروع؟
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4" style={{ wordSpacing: "0.1em", letterSpacing: "0.01em" }}>
                هذا مشروع starter kit متكامل مبني على Next.js 14 مع نظام مصادقة كامل ونظام أدوار وصلاحيات مرن.
                مصمم ليكون نقطة بداية قوية لمشاريعك القادمة.
              </p>
              <p className="text-muted-foreground leading-relaxed" style={{ wordSpacing: "0.1em", letterSpacing: "0.01em" }}>
                يتضمن كل ما تحتاجه للبدء: مصادقة آمنة، إدارة المستخدمين، نظام الصلاحيات، وواجهة مستخدم عربية RTL جاهزة.
              </p>
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              <h3 className="text-2xl font-bold text-foreground mb-4" style={{ wordSpacing: "0.15em" }}>
                لماذا هذا المشروع؟
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4" style={{ wordSpacing: "0.1em", letterSpacing: "0.01em" }}>
                يوفر عليك الوقت والجهد في بناء الأنظمة الأساسية من الصفر.
                ابدأ مباشرة في بناء الميزات الفريدة لمشروعك.
              </p>
              <p className="text-muted-foreground leading-relaxed" style={{ wordSpacing: "0.1em", letterSpacing: "0.01em" }}>
                كود نظيف ومنظم، موثق جيداً، وسهل التخصيص والتوسع حسب احتياجاتك.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-8 text-center glass-card transition-all hover-lift shadow-layered hover:shadow-layered-lg animate-fade-in-up group relative overflow-hidden" style={{ animationDelay: "0.4s" }}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform group-hover:animate-glow-pulse">
                  <Code className="w-8 h-8 text-primary" />
                </div>
                <h4 className="text-2xl font-extrabold text-gradient-primary mb-2">TypeScript</h4>
                <p className="text-muted-foreground font-medium" style={{ wordSpacing: "0.1em" }}>كود آمن ومنظم</p>
              </div>
            </Card>
            <Card className="p-8 text-center glass-card transition-all hover-lift shadow-layered hover:shadow-layered-lg animate-fade-in-up group relative overflow-hidden" style={{ animationDelay: "0.5s" }}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform group-hover:animate-glow-pulse">
                  <Rocket className="w-8 h-8 text-primary" />
                </div>
                <h4 className="text-2xl font-extrabold text-gradient-primary mb-2">جاهز للاستخدام</h4>
                <p className="text-muted-foreground font-medium" style={{ wordSpacing: "0.1em" }}>ابدأ مباشرة</p>
              </div>
            </Card>
            <Card className="p-8 text-center glass-card transition-all hover-lift shadow-layered hover:shadow-layered-lg animate-fade-in-up group relative overflow-hidden" style={{ animationDelay: "0.6s" }}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform group-hover:animate-glow-pulse">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
                <h4 className="text-2xl font-extrabold text-gradient-primary mb-2">مفتوح المصدر</h4>
                <p className="text-muted-foreground font-medium" style={{ wordSpacing: "0.1em" }}>قابل للتخصيص</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
