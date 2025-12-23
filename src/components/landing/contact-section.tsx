"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Send, 
  Loader2, 
  User, 
  Mail, 
  MessageSquare, 
  HelpCircle,
  CheckCircle2
} from "lucide-react"
import toast from "react-hot-toast"
import { cn } from "@/lib/utils"

const contactSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون على الأقل حرفين").max(100, "الاسم طويل جداً"),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  inquiryType: z.enum(["web_inquiry", "project_inquiry", "other"], {
    errorMap: () => ({ message: "نوع الاستفسار مطلوب" }),
  }),
  expectedDailyMessages: z.string().min(1, "عدد الرسائل المتوقع ارسالها في اليوم مطلوب"),
  message: z.string().min(10, "الرسالة يجب أن تكون على الأقل 10 أحرف").max(1000, "الرسالة طويلة جداً"),
})

type ContactFormData = z.infer<typeof contactSchema>

const expectedDailyMessagesOptions = [
  { value: "less-100", label: "أقل من 100" },
  { value: "100-500", label: "100 - 500" },
  { value: "500-1000", label: "500 - 1,000" },
  { value: "1000-5000", label: "1,000 - 5,000" },
  { value: "5000+", label: "أكثر من 5,000" },
]

const inquiryOptions = [
  { 
    value: "other", 
    label: "أخرى",
    icon: CheckCircle2,
    description: "استفسارات أخرى"
  },
  { 
    value: "project_inquiry", 
    label: "استفسار عن مشروع",
    icon: MessageSquare,
    description: "طلب عرض سعر لمشروع"
  },
  { 
    value: "web_inquiry", 
    label: "استفسار عن الخدمة",
    icon: HelpCircle,
    description: "أسئلة عامة عن خدماتنا"
  },
]

export function ContactSection() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      inquiryType: "web_inquiry",
      expectedDailyMessages: "less-100",
    },
  })

  const inquiryType = watch("inquiryType")
  const expectedDailyMessages = watch("expectedDailyMessages")

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message || "تم إرسال رسالتك بنجاح!")
        reset()
      } else {
        toast.error(result.error || "حدث خطأ أثناء إرسال الرسالة")
      }
    } catch (error) {
      console.error("Contact form error:", error)
      toast.error("حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="contact" className="py-20 md:py-28 bg-transparent relative overflow-hidden">
      {/* Subtle Background Overlay - Unified with other sections */}
      <div className="absolute inset-0 z-[2] opacity-20">
        <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-enhanced" style={{ animationDelay: "2.5s" }}></div>
        <div className="absolute bottom-1/3 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-enhanced" style={{ animationDelay: "4.5s" }}></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4" style={{ wordSpacing: "0.2em", letterSpacing: "0.05em" }}>
              <span className="text-gradient-primary">تواصل معنا</span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground font-medium" style={{ wordSpacing: "0.15em", letterSpacing: "0.02em" }}>
              نحن هنا لمساعدتك. أرسل لنا رسالتك وسنتواصل معك قريباً.
            </p>
          </div>

          {/* Contact Form */}
          <Card className="glass-card shadow-layered-lg animate-fade-in-up relative overflow-hidden group" style={{ animationDelay: "0.2s" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="pb-6 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform group-hover:animate-glow-pulse">
                  <MessageSquare className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold" style={{ wordSpacing: "0.1em" }}>أرسل لنا رسالة</CardTitle>
                  <CardDescription className="mt-1" style={{ wordSpacing: "0.1em" }}>
                    املأ النموذج أدناه وسنرد عليك في أقرب وقت ممكن
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Name and Email Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2 text-sm font-semibold">
                      <User className="w-4 h-4 text-primary" />
                      <span>الاسم الكامل</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="name"
                        {...register("name")}
                        placeholder="أدخل اسمك الكامل"
                        disabled={isSubmitting}
                        className={cn(
                          "pr-10 transition-all duration-200",
                          errors.name 
                            ? "border-destructive focus-visible:ring-destructive" 
                            : "focus-visible:ring-primary"
                        )}
                      />
                    </div>
                    {errors.name && (
                      <p className="text-sm text-destructive flex items-center gap-1 animate-fade-in">
                        <span>•</span>
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2 text-sm font-semibold">
                      <Mail className="w-4 h-4 text-primary" />
                      <span>البريد الإلكتروني</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        {...register("email")}
                        placeholder="example@email.com"
                        disabled={isSubmitting}
                        className={cn(
                          "pr-10 transition-all duration-300 border-border hover:border-primary/50",
                          errors.email 
                            ? "border-destructive focus-visible:ring-destructive focus-visible:shadow-glow" 
                            : "focus-visible:ring-primary focus-visible:border-primary focus-visible:shadow-glow"
                        )}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-destructive flex items-center gap-1 animate-fade-in">
                        <span>•</span>
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Inquiry Type - Enhanced Radio Buttons */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-semibold">
                    <HelpCircle className="w-4 h-4 text-primary" />
                    <span>لماذا تتواصل معنا؟</span>
                  </Label>
                  <RadioGroup
                    value={inquiryType}
                    onValueChange={(value) => setValue("inquiryType", value as any)}
                    disabled={isSubmitting}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    {inquiryOptions.map((option, index) => {
                      const Icon = option.icon
                      const isSelected = inquiryType === option.value
                      return (
                        <label
                          key={option.value}
                          htmlFor={option.value}
                          className={cn(
                            "relative flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 group",
                            "hover:shadow-lg hover:scale-[1.02]",
                            isSelected
                              ? "border-primary bg-primary/10 shadow-lg scale-[1.02] ring-2 ring-primary/20"
                              : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
                          )}
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="flex items-center gap-3 mb-2 flex-row-reverse">
                            <RadioGroupItem
                              value={option.value}
                              id={option.value}
                              className="mt-1"
                            />
                            <div className={cn(
                              "p-2 rounded-md transition-all duration-200",
                              isSelected 
                                ? "bg-primary/20 text-primary" 
                                : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                            )}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className={cn(
                              "font-semibold text-sm transition-colors",
                              isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                            )}>
                              {option.label}
                            </span>
                          </div>
                          <p className={cn(
                            "text-xs pl-8 transition-colors text-right",
                            isSelected ? "text-muted-foreground" : "text-muted-foreground/70 group-hover:text-muted-foreground"
                          )}>
                            {option.description}
                          </p>
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                          )}
                        </label>
                      )
                    })}
                  </RadioGroup>
                  {errors.inquiryType && (
                    <p className="text-sm text-destructive flex items-center gap-1 animate-fade-in">
                      <span>•</span>
                      {errors.inquiryType.message}
                    </p>
                  )}
                </div>

                {/* Expected Daily Messages */}
                <div className="space-y-2">
                  <Label htmlFor="expectedDailyMessages" className="flex items-center gap-2 text-sm font-semibold">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span>عدد الرسائل المتوقع ارسالها في اليوم</span>
                  </Label>
                  <Select
                    value={expectedDailyMessages}
                    onValueChange={(value) => setValue("expectedDailyMessages", value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger 
                      id="expectedDailyMessages"
                      className={cn(
                        "transition-all duration-200",
                        errors.expectedDailyMessages 
                          ? "border-destructive focus:ring-destructive" 
                          : "focus:ring-primary"
                      )}
                    >
                      <SelectValue placeholder="اختر عدد الرسائل المتوقع" />
                    </SelectTrigger>
                    <SelectContent>
                      {expectedDailyMessagesOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.expectedDailyMessages && (
                    <p className="text-sm text-destructive flex items-center gap-1 animate-fade-in">
                      <span>•</span>
                      {errors.expectedDailyMessages.message}
                    </p>
                  )}
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message" className="flex items-center gap-2 text-sm font-semibold">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span>رسالتك</span>
                  </Label>
                  <Textarea
                    id="message"
                    {...register("message")}
                    placeholder="اكتب رسالتك هنا..."
                    rows={6}
                    disabled={isSubmitting}
                    className={cn(
                      "resize-none transition-all duration-300 border-border hover:border-primary/50",
                      errors.message 
                        ? "border-destructive focus-visible:ring-destructive focus-visible:shadow-glow" 
                        : "focus-visible:ring-primary focus-visible:border-primary focus-visible:shadow-glow"
                    )}
                  />
                  <div className="flex items-center justify-between">
                    {errors.message ? (
                      <p className="text-sm text-destructive flex items-center gap-1 animate-fade-in">
                        <span>•</span>
                        {errors.message.message}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        الحد الأدنى 10 أحرف
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {watch("message")?.length || 0} / 1000
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full group relative overflow-hidden mt-8 h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-primary shadow-glow hover:shadow-glow-lg transition-all duration-300 border-0"
                  disabled={isSubmitting}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>جاري الإرسال...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                        <span>إرسال الرسالة</span>
                      </>
                    )}
                  </span>
                  {!isSubmitting && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-opacity duration-300"></div>
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
