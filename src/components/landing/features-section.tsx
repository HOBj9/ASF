"use client"

import {
  Building,
  Users,
  Truck,
  MapPinned,
  Route,
  Activity,
  FileSpreadsheet,
  ShieldCheck,
} from "lucide-react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: Building,
    title: "إدارة المؤسسة والفروع",
    description: "إنشاء المؤسسة، إدارة الفروع، وربط كل بيانات التشغيل ضمن بنية هرمية موحدة.",
  },
  {
    icon: Users,
    title: "إدارة السائقين",
    description: "تعريف السائقين، إسنادهم للمركبات، وتحديث الربط التشغيلي بسهولة.",
  },
  {
    icon: Truck,
    title: "إدارة المركبات",
    description: "تعريف المركبات، تتبع حالتها، وربطها بالخطوط والنقاط وسجلات التنفيذ.",
  },
  {
    icon: MapPinned,
    title: "إدارة النقاط والمناطق",
    description: "تعريف نقاط الخدمة، تنظيم المناطق المرتبطة بها، وعرضها مباشرة على الخريطة.",
  },
  {
    icon: Route,
    title: "إدارة الخطوط",
    description: "بناء خطوط التشغيل بالتسلسل، إعادة ترتيب النقاط، ومعاينة الخط على الخريطة.",
  },
  {
    icon: Activity,
    title: "الأحداث والتتبع الحي",
    description: "متابعة الحركة الحية وتسجيل أحداث الدخول والخروج ومدة البقاء لكل نقطة.",
  },
  {
    icon: FileSpreadsheet,
    title: "التقارير والتصدير",
    description: "تقارير يومية وأسبوعية وشهرية وتقارير مخصصة، مع تصدير CSV وExcel.",
  },
  {
    icon: ShieldCheck,
    title: "الأدوار والصلاحيات",
    description: "صلاحيات دقيقة حسب الدور لضمان فصل المسؤوليات وحوكمة العمليات.",
  },
]

export function FeaturesSection() {
  return (
    <section id="modules" className="py-20 md:py-28 bg-transparent relative overflow-hidden">
      <div className="absolute inset-0 z-[2] opacity-20">
        <div
          className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-enhanced"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-enhanced"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4">
            <span className="text-gradient-primary">الوحدات الرئيسية</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed">
            مجموعة وحدات مترابطة تغطي دورة التشغيل الميداني كاملة من التخطيط حتى التقرير
            النهائي.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card
                key={feature.title}
                className="glass-card transition-all hover-lift shadow-layered hover:shadow-layered-lg animate-fade-in-up group relative overflow-hidden h-full"
                style={{ animationDelay: `${0.08 * index}s` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardHeader className="relative z-10 text-right">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg font-bold">{feature.title}</CardTitle>
                  <CardDescription className="text-sm leading-7 mt-2">
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
