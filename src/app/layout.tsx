import type { Metadata } from "next"
import { Cairo } from "next/font/google"
import "./globals.css"
import "leaflet/dist/leaflet.css"
import { AppProviders } from "@/components/providers/app-providers"

const cairo = Cairo({ 
  subsets: ["latin", "arabic"],
  variable: "--font-cairo",
  display: "swap",
})

export const metadata: Metadata = {
  title: "لوحة التحكم",
  description: "نظام إدارة شامل مع نظام المصادقة والأدوار والصلاحيات",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={cairo.className}>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  )
}

