import { beautyWheelTheme } from "@/lib/beauty-wheel-themes";
import type { GamePageTemplateId } from "@/lib/types";

export function beautyCenterFinish(background: string) {
  return `radial-gradient(ellipse at 24% 17%, rgba(255,255,255,.38) 0%, rgba(255,255,255,.1) 23%, transparent 48%), linear-gradient(145deg, color-mix(in srgb, ${background} 94%, white), ${background} 56%, color-mix(in srgb, ${background} 86%, black))`;
}

export function beautyPopCenterFinish(background: string) {
  return `radial-gradient(ellipse at 27% 15%, white 0%, rgba(255,255,255,.65) 5%, rgba(255,255,255,.18) 20%, transparent 42%), radial-gradient(ellipse at 70% 86%, rgba(255,255,255,.35), transparent 30%), linear-gradient(135deg, color-mix(in srgb, ${background} 62%, white), ${background} 52%, color-mix(in srgb, ${background} 80%, black))`;
}

export function beautyPopCenterRelief(rim: string) {
  return { borderColor: rim, boxShadow: `inset 0 0 0 2px rgba(255,238,190,.65), inset 0 -5px 8px rgba(77,0,35,.2), 0 0 0 2px color-mix(in srgb, ${rim} 80%, white), 0 8px 18px rgba(113,21,65,.28)` };
}

/** A darker, single edge and a soft cast shadow; no inner white ring. */
export function beautyCenterRelief(accent: string) {
  return {
    borderColor: `color-mix(in srgb, ${accent} 70%, black)`,
    boxShadow: `0 4px 10px rgba(39,28,23,.20), 0 1px 3px color-mix(in srgb, ${accent} 25%, transparent)`,
  };
}

/** The native rim uses the accent, but an explicit custom rim keeps its color. */
export function beautyWheelRimColor(templateId: GamePageTemplateId, rim: string, accent: string) {
  const theme = beautyWheelTheme(templateId);
  const nativeRim = theme?.secondary ?? "#ffffff";
  if (rim.toLowerCase() !== nativeRim.toLowerCase()) return rim;
  return templateId === "beauty-editorial" ? "#b99a68" : accent;
}
