"use client"

import Link from "next/link"
import Image from "next/image"

export function Footer() {
  const currentYear = new Date().getFullYear()

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (!element) return
    element.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <footer className="relative bg-gradient-to-b from-muted/80 via-muted/70 to-muted/60 overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-14 h-14 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 relative">
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={56}
                  height={56}
                  className="object-contain relative z-10"
                />
              </div>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              منصة تشغيل موحدة لإدارة المؤسسات وفروعها ميدانياً، مع خرائط تفاعلية، تتبع حي،
              تقارير وتحليلات قابلة للتصدير.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">روابط سريعة</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <button
                  onClick={() => scrollToSection("overview")}
                  className="hover:text-primary transition-colors"
                >
                  نظرة عامة
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection("modules")}
                  className="hover:text-primary transition-colors"
                >
                  الوحدات الرئيسية
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection("scenario")}
                  className="hover:text-primary transition-colors"
                >
                  سيناريو التشغيل
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">الدخول للنظام</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/login" className="hover:text-primary transition-colors">
                  تسجيل الدخول
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-primary transition-colors">
                  إنشاء حساب
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© {currentYear} جميع الحقوق محفوظة.</p>
          <p className="text-xs text-muted-foreground">منصة تشغيل المؤسسات والفروع</p>
        </div>
      </div>
    </footer>
  )
}
