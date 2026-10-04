import { beautyWheelTheme } from "@/lib/beauty-wheel-themes";
import type { GamePageTemplateId } from "@/lib/types";

export function beautyCenterFinish(background: string) {
  return `radial-gradient(ellipse at 24% 17%, rgba(255,255,255,.38) 0%, rgba(255,255,255,.1) 23%, transparent 48%), linear-gradient(145deg, color-mix(in srgb, ${background} 94%, white), ${background} 56%, color-mix(in srgb, ${background} 86%, black))`;
}

/** The native rim uses the accent, but an explicit custom rim keeps its color. */
export function beautyWheelRimColor(templateId: GamePageTemplateId, rim: string, accent: string) {
  const theme = beautyWheelTheme(templateId);
  const nativeRim = theme?.secondary ?? "#ffffff";
  if (rim.toLowerCase() !== nativeRim.toLowerCase()) return rim;
  return templateId === "beauty-editorial" ? "#b99a68" : accent;
}
