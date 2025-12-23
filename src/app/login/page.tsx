"use client"

import { useState, useEffect } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import toast from "react-hot-toast"

const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)

  // Redirect to dashboard if user is already authenticated
  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/dashboard")
      router.refresh()
    }
  }, [status, session, router])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  // Show loading state while checking session
  if (status === "loading") {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
        <div className="text-center">جاري التحميل...</div>
      </div>
    )
  }

  // Don't render login form if already authenticated (will redirect)
  if (status === "authenticated") {
    return null
  }

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("تم تسجيل الدخول بنجاح")
        router.push("/dashboard")
        router.refresh()
      }
    } catch (error) {
      toast.error("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Animated Background with Waves */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-purple-600/20 dark:from-purple-900/30 dark:via-blue-900/30 dark:to-purple-800/30">
        <div 
          className="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-purple-500/30 blur-3xl dark:bg-purple-500/20"
          style={{
            animation: 'wave 8s ease-in-out infinite',
          }}
        />
        <div 
          className="absolute -bottom-1/2 -left-1/4 h-[800px] w-[800px] rounded-full bg-blue-500/30 blur-3xl dark:bg-blue-500/20"
          style={{
            animation: 'wave 10s ease-in-out infinite',
            animationDelay: '2s',
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-400/20 blur-3xl dark:bg-purple-400/10"
          style={{
            animation: 'float 12s ease-in-out infinite',
          }}
        />
        <div 
          className="absolute top-1/4 right-1/3 h-[500px] w-[500px] rounded-full bg-blue-400/25 blur-3xl dark:bg-blue-400/15"
          style={{
            animation: 'float 15s ease-in-out infinite',
            animationDelay: '1s',
          }}
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/80 dark:from-background/90 dark:via-background/70 dark:to-background/90" />

      {/* Login Card */}
      <Card className="relative z-10 w-full max-w-md border-0 bg-card/80 backdrop-blur-xl shadow-2xl dark:bg-card/90">
        <CardHeader>
          <CardTitle className="text-2xl text-center">تسجيل الدخول</CardTitle>
          <CardDescription className="text-center">
            أدخل بياناتك للوصول إلى لوحة التحكم
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

