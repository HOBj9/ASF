"use client";

import { Tooltip } from "react-leaflet";

const MAP_LABEL_TOOLTIP_CLASS =
  "!bg-white !border !border-border !text-black !text-xs font-medium";

type MapLabelTooltipProps = {
  children: React.ReactNode;
  direction?: "top" | "bottom" | "left" | "right" | "center";
  offset?: [number, number];
  opacity?: number;
  permanent?: boolean;
};

/**
 * تسمية موحّدة للخريطة: صندوق أبيض مع نص أسود.
 * يُستخدم فوق المركبات والنقاط وعلامات أثر في الخرائط.
 */
export function MapLabelTooltip({
  children,
  direction = "top",
  offset = [0, -12],
  opacity = 1,
  permanent = true,
}: MapLabelTooltipProps) {
  return (
    <Tooltip
      direction={direction}
      offset={offset}
      opacity={opacity}
      permanent={permanent}
      className={MAP_LABEL_TOOLTIP_CLASS}
    >
      {children}
    </Tooltip>
  );
}
