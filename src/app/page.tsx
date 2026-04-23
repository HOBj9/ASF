import type { Metadata } from "next"
import { LandingPageShell } from "@/components/landing/landing-page-shell"

export const metadata: Metadata = {
  title: "منصة إدارة العمليات الميدانية وإدارة النفايات",
  description:
    "منصة تشغيل مركزية لإدارة الأساطيل والمسارات والنقاط والتتبع الحي والتقارير والصلاحيات للجهات المشغلة والبلديات.",
}

export default function LandingPage() {
  return <LandingPageShell />
}
