"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import type { MotionValue } from "framer-motion"
import { cn } from "@/lib/utils"

type RouteVehicleProps = {
  x: MotionValue<number>
  y: MotionValue<number>
  angle: MotionValue<number>
  compact: boolean
  prefersReducedMotion: boolean
}

export function RouteVehicle({ x, y, angle, compact, prefersReducedMotion }: RouteVehicleProps) {
  return (
    <motion.div
      className="absolute z-[2] overflow-visible"
      style={{
        left: x,
        top: y,
        rotate: angle,
        scaleX: 1,
        scaleY: 1,
        x: "-50%",
        y: "-50%",
        transformOrigin: "52% 58%",
        willChange: "transform",
      }}
      transition={{ duration: prefersReducedMotion ? 0.15 : 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative overflow-visible drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]">
        <span className="pointer-events-none absolute -inset-6 rounded-[999px] bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.14),transparent_72%)] blur-sm" />
        <Image
          src="/ChatGPT Image Apr 23, 2026, 03_56_03 AM.svg"
          alt=""
          width={512}
          height={341}
          unoptimized
          className={cn("rounded-sm object-contain", compact ? "h-[130px] w-[244px]" : "h-[210px] w-[394px]")}
          style={{
            WebkitMaskImage: "radial-gradient(ellipse at center, rgba(0,0,0,1) 62%, rgba(0,0,0,0) 100%)",
            maskImage: "radial-gradient(ellipse at center, rgba(0,0,0,1) 62%, rgba(0,0,0,0) 100%)",
          }}
        />
        <motion.span
          className="pointer-events-none absolute -inset-2 rounded-[999px] bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.2),transparent_76%)]"
          animate={prefersReducedMotion ? { opacity: 0.4 } : { opacity: [0.2, 0.45, 0.2] }}
          transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  )
}
