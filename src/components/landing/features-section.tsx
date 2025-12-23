"use client"

import {
  Shield,
  Users,
  KeyRound,
  Settings,
  Lock,
  Zap,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: Shield,
    title: "نظام مصادقة آمن",
    description:
      "نظام مصادقة متكامل وآمن باستخدام NextAuth.js مع دعم كامل للمصادقة بالبريد الإلكتروني وكلمة المرور.",
  },
  {
    icon: Users,
    title: "إدارة المستخدمين",
    description:
      "نظام شامل لإدارة المستخدمين مع إمكانية إنشاء وتعديل وحذف المستخدمين مع التحكم الكامل في الصلاحيات.",
  },
  {
    icon: KeyRound,
    title: "الأدوار والصلاحيات",
    description:
      "نظام مرن للأدوار والصلاحيات يتيح لك تخصيص الصلاحيات لكل دور حسب احتياجاتك.",
  },
  {
    icon: Settings,
    title: "قابل للتخصيص",
    description:
      "قاعدة كود نظيفة ومنظمة تتيح لك التخصيص السريع وإضافة الميزات التي تحتاجها بسهولة.",
  },
  {
    icon: Lock,
    title: "آمن ومحمي",
    description:
      "حماية متقدمة للمسارات والبيانات مع middleware مخصص للتحقق من الصلاحيات.",
  },
  {
    icon: Zap,
    title: "جاهز للاستخدام",
    description:
      "مشروع جاهز للبدء مع Docker و MongoDB و TypeScript و Tailwind CSS مع واجهة مستخدم عربية RTL.",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-28 bg-transparent relative overflow-hidden">
      <div className="absolute inset-0 z-[2] opacity-20">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-enhanced" style={{ animationDelay: "2s" }}></div>
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-enhanced" style={{ animationDelay: "4s" }}></div>
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4" style={{ wordSpacing: "0.2em", letterSpacing: "0.05em" }}>
            <span className="text-gradient-primary">الميزات الرئيسية</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium" style={{ wordSpacing: "0.15em", letterSpacing: "0.02em" }}>
            كل ما تحتاجه لبدء مشروعك بسرعة وكفاءة
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
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
                  <CardTitle className="text-xl font-bold" style={{ wordSpacing: "0.1em" }}>{feature.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed mt-2" style={{ wordSpacing: "0.1em", letterSpacing: "0.01em" }}>
                    {feature.description}
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
