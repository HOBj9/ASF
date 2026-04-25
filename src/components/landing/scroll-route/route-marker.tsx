"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import type { RouteDir } from "@/components/landing/scroll-route/route-types"

type RouteMarkerProps = {
  stopId: string
  index: number
  dir: RouteDir
  className?: string
}

export function RouteMarker({ stopId, index, dir, className }: RouteMarkerProps) {
  const isEven = index % 2 === 0
  const placeOnLeft = dir === "rtl" ? isEven : !isEven

  return (
    <div
      data-route-stop={stopId}
      data-route-active="false"
      className={cn(
        "group pointer-events-none absolute top-1/2 z-[3] -translate-y-1/2 transition-transform duration-300",
        placeOnLeft ? "left-[9%] md:left-[11%] lg:left-[13%]" : "right-[9%] md:right-[11%] lg:right-[13%]",
        className,
      )}
      aria-hidden="true"
    >
      <div className="relative -translate-x-1/2">
        <Image
          src="/ChatGPT Image Apr 23, 2026, 03_53_50 AM.png"
          alt=""
          width={200}
          height={200}
          unoptimized
          className={cn(
            "marker-core h-28 w-28 object-contain opacity-75 transition-all duration-300 sm:h-32 sm:opacity-90 md:h-40 md:w-40 md:opacity-95",
            "drop-shadow-[0_0_8px_rgba(16,185,129,0.28)] sm:drop-shadow-[0_0_12px_rgba(16,185,129,0.45)]",
            "group-data-[route-active=true]:scale-110 group-data-[route-active=true]:opacity-100",
            "group-data-[route-active=true]:drop-shadow-[0_0_14px_rgba(16,185,129,0.55)] sm:group-data-[route-active=true]:drop-shadow-[0_0_24px_rgba(16,185,129,0.9)]",
          )}
        />
        <span
          className={cn(
            "absolute left-1/2 top-[82%] h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/35 opacity-0 sm:h-20 sm:w-20 sm:border-primary/45",
            "transition-all duration-300 group-data-[route-active=true]:opacity-100 group-data-[route-active=true]:animate-ping",
          )}
        />
        <span
          className={cn(
            "absolute left-1/2 top-[82%] h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/45 blur-sm opacity-70",
            "transition-all duration-300 group-data-[route-active=true]:h-11 group-data-[route-active=true]:w-11 group-data-[route-active=true]:bg-primary/70",
          )}
        />
      </div>
    </div>
  )
}
