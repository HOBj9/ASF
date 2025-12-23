import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldX } from "lucide-react"

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <ShieldX className="mx-auto h-12 w-12 text-destructive mb-4" />
          <CardTitle className="text-2xl">غير مصرح</CardTitle>
          <CardDescription>
            ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link href="/dashboard">
            <Button>العودة إلى لوحة التحكم</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

