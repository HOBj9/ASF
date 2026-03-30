import Link from "next/link"
import { Button } from "@/components/ui/button"
import { TrackingSimulator } from "@/components/tracking/tracking-simulator"

export default function TrackingSimulatorPage() {
  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-background p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2 text-right">
            <h1 className="text-3xl font-bold">محاكي تتبع الموبايل</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              صفحة مؤقتة داخل المتصفح لتجربة دورة تتبع الموبايل كاملة: تسجيل دخول مشرف الخط، تفعيل الجهاز، جمع النقاط، ثم إرسال دفعات GPS إلى النظام.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <Button asChild variant="outline">
              <Link href="/dashboard/tracking">فتح لوحة مراقبة التتبع</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/login">فتح صفحة تسجيل الدخول</Link>
            </Button>
          </div>
        </div>

        <TrackingSimulator />
      </div>
    </div>
  )
}
