"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import toast from "react-hot-toast"
import { RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function SeedPage() {
  const [loading, setLoading] = useState(false)
  const [seedDialogOpen, setSeedDialogOpen] = useState(false)
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)

  const handleSeedClick = () => {
    setSeedDialogOpen(true)
  }

  const handleSeed = async () => {
    setSeedDialogOpen(false)

    setLoading(true)
    try {
      const response = await fetch("/api/seed", {
        method: "POST",
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || "حدث خطأ أثناء تهيئة قاعدة البيانات")
      } else {
        toast.success("✅ تم تهيئة قاعدة البيانات بنجاح!")
        setSuccessDialogOpen(true)
      }
    } catch (error) {
      toast.error("حدث خطأ في الاتصال")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4 lg:p-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            إعادة تهيئة قاعدة البيانات
          </CardTitle>
          <CardDescription>
            إعادة تهيئة قاعدة البيانات وإنشاء البيانات الافتراضية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  تحذير مهم
                </h3>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
                  <li>سيتم حذف جميع المستخدمين الحاليين</li>
                  <li>سيتم حذف جميع الأدوار الحالية</li>
                  <li>سيتم حذف جميع الصلاحيات الحالية</li>
                  <li>سيتم إنشاء بيانات افتراضية جديدة</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              البيانات التي سيتم إنشاؤها:
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>13 صلاحية أساسية:
                <ul className="list-disc list-inside mr-4 mt-1 space-y-0.5">
                  <li>إدارة الكل</li>
                  <li>المستخدمين (إنشاء/قراءة/تحديث/حذف)</li>
                  <li>الأدوار (إنشاء/قراءة/تحديث/حذف)</li>
                  <li>الصلاحيات (إنشاء/قراءة/تحديث/حذف)</li>
                </ul>
              </li>
              <li>دور المدير (مع جميع الصلاحيات)</li>
              <li>دور المستخدم (مع صلاحية قراءة المستخدمين فقط)</li>
              <li>حساب مدير: admin@example.com / admin123</li>
              <li>حساب مستخدم: user@example.com / user123</li>
            </ul>
          </div>

          <Button
            onClick={handleSeedClick}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                جاري إعادة التهيئة...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 ml-2" />
                إعادة تهيئة قاعدة البيانات
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Seed Confirmation Dialog */}
      <Dialog open={seedDialogOpen} onOpenChange={setSeedDialogOpen}>
        <DialogContent className="text-right">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              تأكيد إعادة تهيئة قاعدة البيانات
            </DialogTitle>
            <DialogDescription className="text-right">
              <div className="space-y-2">
                <p>
                  ⚠️ <strong>تحذير:</strong> سيتم حذف جميع البيانات الحالية وإعادة تهيئة قاعدة البيانات.
                </p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• سيتم حذف جميع المستخدمين الحاليين</p>
                  <p>• سيتم حذف جميع الأدوار الحالية</p>
                  <p>• سيتم حذف جميع الصلاحيات الحالية</p>
                  <p>• سيتم إنشاء بيانات افتراضية جديدة</p>
                </div>
                <p className="text-destructive font-semibold mt-2">
                  هذه العملية لا يمكن التراجع عنها.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:gap-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setSeedDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleSeed}
              disabled={loading}
            >
              {loading ? "جاري التهيئة..." : "تأكيد وإعادة التهيئة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="text-right">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              تم تهيئة قاعدة البيانات بنجاح!
            </DialogTitle>
            <DialogDescription className="text-right">
              <div className="space-y-3">
                <p>✅ تم تهيئة قاعدة البيانات بنجاح!</p>
                <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                  <p className="font-semibold">📋 الحسابات الافتراضية:</p>
                  <div className="space-y-2">
                    <div>
                      <p className="font-medium">👑 مدير:</p>
                      <p className="text-muted-foreground mr-4">البريد: admin@example.com</p>
                      <p className="text-muted-foreground mr-4">كلمة المرور: admin123</p>
                    </div>
                    <div>
                      <p className="font-medium">👤 مستخدم عادي:</p>
                      <p className="text-muted-foreground mr-4">البريد: user@example.com</p>
                      <p className="text-muted-foreground mr-4">كلمة المرور: user123</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  يمكنك الآن تسجيل الدخول باستخدام هذه الحسابات.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setSuccessDialogOpen(false)}
              className="w-full"
            >
              موافق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
