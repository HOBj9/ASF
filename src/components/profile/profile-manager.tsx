"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useApi } from "@/lib/hooks/use-api"
import { putRequest } from "@/lib/api/helpers"
import toast from "react-hot-toast"
import { User, Camera, Save } from "lucide-react"
import { useSession } from "next-auth/react"

const profileSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  avatar: z.string().optional(),
  businessName: z.string().optional(),
}).refine((data) => {
  if (data.password && data.password.length > 0) {
    return data.password.length >= 6
  }
  return true
}, {
  message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
  path: ["password"],
}).refine((data) => {
  if (data.password && data.password.length > 0) {
    return data.password === data.confirmPassword
  }
  return true
}, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
})

type ProfileFormValues = z.infer<typeof profileSchema>

interface ProfileManagerProps {
  initialUser: {
    id: string
    name: string
    email: string
    avatar?: string
    businessName?: string
  }
}

export function ProfileManager({ initialUser }: ProfileManagerProps) {
  const { data: session, update: updateSession } = useSession()
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialUser.avatar || null)
  const [avatarBase64, setAvatarBase64] = useState<string | null>(initialUser.avatar || null)
  const [isUploading, setIsUploading] = useState(false)
  const { execute: updateProfile, loading } = useApi()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: initialUser.name,
      email: initialUser.email,
      password: "",
      confirmPassword: "",
      avatar: initialUser.avatar || "",
      businessName: initialUser.businessName || "",
    },
  })

  const watchedAvatar = watch("avatar")

  useEffect(() => {
    if (watchedAvatar) {
      setAvatarPreview(watchedAvatar)
      setAvatarBase64(watchedAvatar)
    }
  }, [watchedAvatar])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("الرجاء اختيار ملف صورة")
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن يكون أقل من 2 ميجابايت")
      return
    }

    setIsUploading(true)

    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        // Update all states to ensure consistency
        setValue("avatar", base64String, { shouldValidate: true, shouldDirty: true })
        setAvatarPreview(base64String)
        setAvatarBase64(base64String)
        setIsUploading(false)
        toast.success("تم رفع الصورة بنجاح. اضغط على 'حفظ التغييرات' لحفظها.")
      }
      reader.onerror = () => {
        toast.error("حدث خطأ أثناء قراءة الصورة")
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      toast.error("حدث خطأ أثناء رفع الصورة")
      setIsUploading(false)
    }
  }

  const onSubmit = async (data: ProfileFormValues) => {
    const updateData: any = {
      name: data.name,
      email: data.email,
      businessName: data.businessName || null,
    }

    if (data.password && data.password.trim() !== "") {
      updateData.password = data.password
    }

    // Always send avatar - prioritize avatarBase64 (the state that gets updated when user uploads)
    // This ensures the image is saved even if form data doesn't reflect it immediately
    // Check if user uploaded a new image (avatarBase64 is set and different from initial)
    const hasNewAvatar = avatarBase64 !== null && avatarBase64 !== initialUser.avatar
    
    if (hasNewAvatar) {
      // User uploaded a new image, use it
      updateData.avatar = avatarBase64
    } else if (avatarBase64 !== null) {
      // avatarBase64 exists (even if same as initial) - send it to ensure it's saved
      updateData.avatar = avatarBase64
    } else if (data.avatar && data.avatar !== "" && data.avatar !== initialUser.avatar) {
      // Form has a different avatar than initial, use it
      updateData.avatar = data.avatar
    } else if (initialUser.avatar) {
      // No new image uploaded, keep existing
      updateData.avatar = initialUser.avatar
    }
    // If avatar is not in updateData, it won't be changed in DB

    await updateProfile(
      putRequest("/profile", updateData),
      {
        onSuccess: async (response) => {
          toast.success(response.message || "تم تحديث البيانات بنجاح")
          
          // Update session with the new avatar from response
          if (response.data?.user) {
            await updateSession({
              ...session,
              user: {
                ...session?.user,
                avatar: response.data.user.avatar || null,
                name: response.data.user.name || session?.user?.name,
                email: response.data.user.email || session?.user?.email,
              }
            })
          } else {
            // Fallback: trigger session update
            await updateSession()
          }
          
          // Update local state
          if (response.data?.user?.avatar) {
            setAvatarPreview(response.data.user.avatar)
            setAvatarBase64(response.data.user.avatar)
          }
          
          // Reload page to get updated data
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        },
        onError: (error) => {
          toast.error(error || "فشل في تحديث البيانات")
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Picture Section */}
      <Card className="text-right">
        <CardHeader>
          <CardTitle className="text-right">الصورة الشخصية</CardTitle>
          <CardDescription className="text-right">
            قم برفع صورة شخصية لحسابك
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile"
                  className="h-24 w-24 rounded-full object-cover border-4 border-purple-500/20 dark:border-purple-400/30"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary-light))] flex items-center justify-center border-4 border-[hsl(var(--primary))]/20">
                  <User className="h-12 w-12 text-white" />
                </div>
              )}
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] text-[hsl(var(--primary-foreground))] rounded-full p-2 cursor-pointer shadow-lg transition-all hover:scale-110"
              >
                <Camera className="h-4 w-4" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                {isUploading ? "جاري رفع الصورة..." : "انقر على الأيقونة لرفع صورة جديدة"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                الحد الأقصى لحجم الصورة: 2 ميجابايت
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card className="text-right">
        <CardHeader>
          <CardTitle className="text-right">معلومات الحساب</CardTitle>
          <CardDescription className="text-right">
            قم بتحديث معلومات حسابك الشخصي
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">الاسم</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="أدخل اسمك"
                className="text-right"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="example@email.com"
                className="text-right"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور الجديدة (اختياري)</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                placeholder="اتركه فارغاً إذا لم ترد تغيير كلمة المرور"
                className="text-right"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register("confirmPassword")}
                placeholder="أعد إدخال كلمة المرور الجديدة"
                className="text-right"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName">اسم العمل</Label>
              <Input
                id="businessName"
                {...register("businessName")}
                placeholder="اسم العمل (يُستخدم في رسائل التحقق)"
                className="text-right"
              />
              {errors.businessName && (
                <p className="text-sm text-destructive">{errors.businessName.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading || isUploading}>
              {loading ? (
                <>
                  <span className="ml-2">جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="ml-2 h-4 w-4" />
                  حفظ التغييرات
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

