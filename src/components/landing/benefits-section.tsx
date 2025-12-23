"use client"

import {
  Clock,
  Shield,
  Headphones,
  Zap,
  BarChart3,
  Puzzle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const benefits = [
  {
    icon: Clock,
    title: "توفير الوقت والجهد",
    description:
      "أتمتة عمليات إرسال الرسائل والردود التلقائية يوفر لك ساعات من العمل اليومي. ركز على ما يهم حقاً.",
  },
  {
    icon: Shield,
    title: "أمان عالي",
    description:
      "نظام أمان متقدم يحمي بياناتك وجلساتك. تشفير كامل، إدارة الصلاحيات، وتتبع جميع الأنشطة.",
  },
  {
    icon: Headphones,
    title: "دعم فني متميز",
    description:
      "فريق دعم فني متاح لمساعدتك في أي وقت. وثائق شاملة، أمثلة عملية، ودعم مباشر.",
  },
  {
    icon: Zap,
    title: "أداء عالي",
    description:
      "نظام محسّن للأداء يعمل بسرعة وكفاءة. معالجة آلاف الرسائل في دقائق معدودة.",
  },
  {
    icon: BarChart3,
    title: "تقارير مفصلة",
    description:
      "إحصائيات وتقارير شاملة عن جميع أنشطتك. تتبع الأداء، معدلات النجاح، والاستهلاك.",
  },
  {
    icon: Puzzle,
    title: "تكامل سهل",
    description:
      "تكامل سهل مع أنظمتك الحالية عبر API متقدم. وثائق واضحة وأمثلة جاهزة للاستخدام.",
  },
]

export function BenefitsSection() {
  return (
    <section id="benefits" className="py-20 md:py-28 bg-transparent relative overflow-hidden">
      {/* Subtle Background Overlay - Unified with other sections */}
      <div className="absolute inset-0 z-[2] opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-enhanced" style={{ animationDelay: "1.5s" }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-enhanced" style={{ animationDelay: "3.5s" }}></div>
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4" style={{ wordSpacing: "0.2em", letterSpacing: "0.05em" }}>
            <span className="text-gradient-primary">ماذا يستفيد العميل من الخدمة</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium" style={{ wordSpacing: "0.15em", letterSpacing: "0.02em" }}>
            فوائد حقيقية تحسن من عملك وتواصلك
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <Card
                key={index}
                className="glass-card transition-all hover-lift shadow-layered hover:shadow-layered-lg animate-fade-in-up group relative overflow-hidden h-full"
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardHeader className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform group-hover:animate-glow-pulse">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-bold" style={{ wordSpacing: "0.1em" }}>{benefit.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed mt-2" style={{ wordSpacing: "0.1em", letterSpacing: "0.01em" }}>
                    {benefit.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
