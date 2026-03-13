"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface StepperProps {
  steps: {
    title: string
    description?: string
  }[]
  currentStep: number
  progress?: number // Progress from step 1 to step 2 (0-100)
  className?: string
}

export function Stepper({ steps, currentStep, progress = 0, className }: StepperProps) {
  return (
    <div className={cn("w-full", className)} dir="rtl">
      <div className="flex items-center gap-4 md:gap-6">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber === currentStep
          const isCompleted = stepNumber < currentStep
          const isPending = stepNumber > currentStep
          
          // Calculate green intensity for step 1 based on progress
          const isStep1 = stepNumber === 1
          const greenIntensity = isStep1 && currentStep === 1 ? Math.min(progress / 100, 1) : 0

          return (
            <div key={index} className="flex items-center flex-1 min-w-[3.5rem]">
              <div className="flex flex-col items-center flex-1 min-w-0 w-full">
                {/* Step Circle */}
                <div className="relative flex items-center justify-center">
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 relative overflow-hidden",
                      isCompleted && "bg-[hsl(var(--success))] border-[hsl(var(--success))]",
                      isActive && !isStep1 && "bg-whatsapp border-whatsapp animate-pulse",
                      isPending && "bg-muted border-muted-foreground/30",
                      isStep1 && isActive && greenIntensity > 0 && "border-[hsl(var(--success))]"
                    )}
                  >
                    {/* WhatsApp Green background (base) */}
                    {isStep1 && isActive && (
                      <div className="absolute inset-0 bg-whatsapp transition-all duration-300" />
                    )}
                    {/* Green fill from right to left */}
                    {isStep1 && isActive && greenIntensity > 0 && (
                      <div
                        className="absolute inset-0 bg-[hsl(var(--success))] transition-all duration-300"
                        style={{
                          clipPath: `inset(0 0 0 ${(1 - greenIntensity) * 100}%)`,
                        }}
                      />
                    )}
                    <div className="relative z-10 flex items-center justify-center w-full h-full">
                      {isCompleted ? (
                        <Check className="h-5 w-5 text-white" />
                      ) : (
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            isActive && "text-white",
                            isPending && "text-muted-foreground"
                          )}
                        >
                          {stepNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Step Title - line-clamp-2 to avoid truncation, RTL-friendly */}
                <div className="mt-2 text-center w-full min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium transition-colors line-clamp-2 break-words",
                      isActive && !isStep1 && "text-whatsapp",
                      isActive && isStep1 && greenIntensity > 0.5 && "text-[hsl(var(--success))]",
                      isActive && isStep1 && greenIntensity <= 0.5 && "text-whatsapp",
                      isCompleted && "text-[hsl(var(--success))]",
                      isPending && "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 break-words">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
              {/* Connector Line with Progress (RTL: line sits between steps) */}
              {index < steps.length - 1 && (
                <div className="relative flex-1 min-w-[1rem] h-1.5 mx-2 md:mx-3 bg-muted overflow-hidden rounded-full shrink-0">
                  {index === 0 && currentStep === 1 && progress > 0 && (
                    <div
                      className="absolute right-0 top-0 h-full bg-[hsl(var(--success))] transition-all duration-300 ease-linear rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  )}
                  {isCompleted && (
                    <div className="absolute right-0 top-0 h-full w-full bg-[hsl(var(--success))] transition-all duration-300 rounded-full" />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

