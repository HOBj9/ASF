"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

export const LANDING_SCENE_SVG = "/ChatGPT Image Apr 23, 2026, 02_34_04 AM.svg"
export const LANDING_SCENE_WIDTH = 1536
export const LANDING_SCENE_HEIGHT = 1024

export const LANDING_PIN_CROP = { x: 1110, y: 280, w: 130, h: 160 }
export const LANDING_BUS_CROP = { x: 760, y: 690, w: 210, h: 115 }

export function SvgSpriteCrop({
  crop,
  className,
}: {
  crop: { x: number; y: number; w: number; h: number }
  className?: string
}) {
  const scale = 1
  const renderedWidth = crop.w * scale
  const renderedHeight = crop.h * scale
  const imageWidth = LANDING_SCENE_WIDTH * scale
  const imageHeight = LANDING_SCENE_HEIGHT * scale

  return (
    <div className={cn("overflow-hidden", className)} style={{ width: renderedWidth, height: renderedHeight }}>
      <Image
        src={LANDING_SCENE_SVG}
        alt=""
        width={LANDING_SCENE_WIDTH}
        height={LANDING_SCENE_HEIGHT}
        unoptimized
        className="pointer-events-none select-none"
        style={{
          width: imageWidth,
          height: imageHeight,
          maxWidth: "none",
          transform: `translate(${-crop.x * scale}px, ${-crop.y * scale}px)`,
        }}
      />
    </div>
  )
}
