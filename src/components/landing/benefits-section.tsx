"use client"

import { Card } from "@/components/ui/card"
import { Building2, MapPin, BarChart3, CheckCircle2 } from "lucide-react"

const scenarioSteps = [
  {
    icon: Building2,
    title: "1) إعداد المؤسسة",
    description:
      "تقوم الجهة المشغلة بإنشاء مؤسسة باسم مجلس مدينة طرطوس، ثم تحدد التسميات: البلديات، شاحنات القمامة، حاويات القمامة، خطوط النقل.",
  },
  {
    icon: MapPin,
    title: "2) تشغيل البلديات",
    description:
      "يتم إنشاء فروع بلديات وربط كل فرع بموقعه، ثم إضافة النقاط والخطوط والمركبات والسائقين وبدء المتابعة الميدانية اليومية.",
  },
  {
    icon: BarChart3,
    title: "3) المتابعة والقياس",
    description:
      "تعرض لوحة المؤسسة أداء كل بلدية: نسبة الإنجاز، عدد المركبات النشطة، الزيارات، مدة الخدمة، مع تقارير قابلة للتصدير والتحليل.",
  },
]

const outcomes = [
  "رؤية موحدة على مستوى المؤسسة وكامل الفروع",
  "تتبع يومي دقيق للحركة والتنفيذ",
  "تقليل الفاقد التشغيلي ورفع جودة الخدمة",
  "جاهزية كاملة للعرض التنفيذي أمام المستثمرين",
]

export function BenefitsSection() {
  return (
    <section id="scenario" className="py-20 md:py-28 bg-transparent relative overflow-hidden">
      <div className="absolute inset-0 z-[2] opacity-20">
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-enhanced"
          style={{ animationDelay: "1.5s" }}
        ></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-enhanced"
          style={{ animationDelay: "3.5s" }}
        ></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-14 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4">
            <span className="text-gradient-primary">سيناريو تشغيل جاهز</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed">
            مثال تطبيقي لكيفية تشغيل النظام في مجلس مدينة طرطوس من مستوى المؤسسة حتى مستوى
            البلدية.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {scenarioSteps.map((step, index) => {
            const Icon = step.icon
            return (
              <Card
                key={step.title}
                className="p-6 glass-card transition-all hover-lift shadow-layered hover:shadow-layered-lg animate-fade-in-up h-full"
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-7">{step.description}</p>
              </Card>
            )
          })}
        </div>

        <Card
          className="p-6 glass-card shadow-layered animate-fade-in-up"
          style={{ animationDelay: "0.5s" }}
        >
          <h3 className="text-xl font-bold mb-4">القيمة المتوقعة من التطبيق</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {outcomes.map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm md:text-base">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  )
}
