"use client"

import Link from "next/link"
import Image from "next/image"
import { Facebook, Twitter, Linkedin, Instagram } from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <footer className="relative bg-gradient-to-b from-muted via-muted/95 to-muted overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary rounded-full blur-3xl"></div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo and Description */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-14 h-14 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 relative">
                <div className="absolute inset-0 bg-primary/10 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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
              نظام متكامل لإدارة التواصل عبر واتساب بطريقة احترافية وآمنة
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">روابط سريعة</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => scrollToSection("about")}
                  className="text-sm text-muted-foreground hover:text-primary transition-all duration-300 hover:translate-x-[-4px] relative group"
                >
                  <span className="relative">من نحن</span>
                  <span className="absolute bottom-0 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection("features")}
                  className="text-sm text-muted-foreground hover:text-primary transition-all duration-300 hover:translate-x-[-4px] relative group"
                >
                  <span className="relative">الميزات</span>
                  <span className="absolute bottom-0 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection("benefits")}
                  className="text-sm text-muted-foreground hover:text-primary transition-all duration-300 hover:translate-x-[-4px] relative group"
                >
                  <span className="relative">الفوائد</span>
                  <span className="absolute bottom-0 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection("contact")}
                  className="text-sm text-muted-foreground hover:text-primary transition-all duration-300 hover:translate-x-[-4px] relative group"
                >
                  <span className="relative">تواصل معنا</span>
                  <span className="absolute bottom-0 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                </button>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">الموارد</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-primary transition-all duration-300 hover:translate-x-[-4px] relative group inline-block"
                >
                  <span className="relative">تسجيل الدخول</span>
                  <span className="absolute bottom-0 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-sm text-muted-foreground hover:text-primary transition-all duration-300 hover:translate-x-[-4px] relative group inline-block"
                >
                  <span className="relative">إنشاء حساب</span>
                  <span className="absolute bottom-0 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-primary transition-all duration-300 hover:translate-x-[-4px] relative group inline-block"
                >
                  <span className="relative">الوثائق</span>
                  <span className="absolute bottom-0 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-primary transition-all duration-300 hover:translate-x-[-4px] relative group inline-block"
                >
                  <span className="relative">الدعم الفني</span>
                  <span className="absolute bottom-0 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">تابعنا</h3>
            <div className="flex gap-4">
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-all duration-300 hover:scale-110 hover:shadow-glow overflow-hidden"
                aria-label="Facebook"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300"></div>
                <Facebook className="w-5 h-5 relative z-10 group-hover:scale-110 transition-transform duration-300" />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-all duration-300 hover:scale-110 hover:shadow-glow overflow-hidden"
                aria-label="Twitter"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300"></div>
                <Twitter className="w-5 h-5 relative z-10 group-hover:scale-110 transition-transform duration-300" />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-all duration-300 hover:scale-110 hover:shadow-glow overflow-hidden"
                aria-label="LinkedIn"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300"></div>
                <Linkedin className="w-5 h-5 relative z-10 group-hover:scale-110 transition-transform duration-300" />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-all duration-300 hover:scale-110 hover:shadow-glow overflow-hidden"
                aria-label="Instagram"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300"></div>
                <Instagram className="w-5 h-5 relative z-10 group-hover:scale-110 transition-transform duration-300" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground text-center md:text-right">
            © {currentYear} جميع الحقوق محفوظة.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link
              href="#"
              className="hover:text-primary transition-all duration-300 hover:translate-x-[-2px] relative group"
            >
              <span className="relative">سياسة الخصوصية</span>
              <span className="absolute bottom-0 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link
              href="#"
              className="hover:text-primary transition-all duration-300 hover:translate-x-[-2px] relative group"
            >
              <span className="relative">شروط الخدمة</span>
              <span className="absolute bottom-0 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
