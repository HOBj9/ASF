"use client"

import { Building2, GitBranch, Settings2, Gauge } from "lucide-react"
import { Card } from "@/components/ui/card"

const workflow = [
  {
    icon: Building2,
    title: "تعريف المؤسسة",
    description: "إنشاء كيان المؤسسة وضبط نوع النشاط والهوية التشغيلية والتسميات الرئيسية.",
  },
  {
    icon: Settings2,
    title: "تخصيص التسميات",
    description: "تحديد المصطلحات حسب النشاط مثل: الفروع، المركبات، النقاط، الخطوط، والسائقين.",
  },
  {
    icon: GitBranch,
    title: "تشغيل الفروع",
    description: "كل فرع يضيف بياناته التشغيلية: مركبات، سائقون، نقاط، خطوط، وأحداث التنفيذ.",
  },
  {
    icon: Gauge,
    title: "متابعة وتحسين",
    description: "لوحات معلومات مباشرة وتقارير مفصلة لقياس الأداء ورفع نسبة الإنجاز.",
  },
]

export function AboutSection() {
  return (
    <section id="overview" className="py-20 md:py-28 bg-transparent relative overflow-hidden">
      <div className="absolute inset-0 z-[2] opacity-20">
        <div
          className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-enhanced"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-enhanced"
          style={{ animationDelay: "3s" }}
        ></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-5xl mx-auto text-center mb-14 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4">
            <span className="text-gradient-primary">كيف يعمل النظام؟</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed">
            هيكل تشغيلي مرن يبدأ من المؤسسة وينتهي بمتابعة يومية دقيقة لكل فرع وموارده
            ومهامه الميدانية.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workflow.map((step, index) => {
            const Icon = step.icon
            return (
              <Card
                key={step.title}
                className="p-6 glass-card transition-all hover-lift shadow-layered hover:shadow-layered-lg animate-fade-in-up relative overflow-hidden"
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-right">
                    <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
