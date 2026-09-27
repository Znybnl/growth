import type { CSSProperties } from "react";
import { DEFAULT_COCORICO_DUO_BLUE, DEFAULT_COCORICO_DUO_YELLOW } from "@/lib/campaign-defaults";
import type { GamePageTemplateId } from "@/lib/types";

const THUMBNAIL_STYLES: Partial<Record<GamePageTemplateId, {
  background: string;
  rim: string;
  segments: [string, string, string, string];
  center: string;
  centerText: string;
  marker: string;
  glow: string;
}>> = {
  "cocorico-wheel": {
    background: "linear-gradient(145deg,#e8f2ff,#dceaff)", rim: "#ffffff",
    segments: ["#1354a5", "#ffffff", "#2674c8", "#eaf3ff"], center: "#1458a7", centerText: "#fff", marker: "#174d8f", glow: "rgba(21,84,165,.20)",
  },
  "cocorico-duo-wheel": {
    background: "linear-gradient(145deg,#eef6ff,#fff8dc)", rim: "#fff", segments: [DEFAULT_COCORICO_DUO_BLUE, DEFAULT_COCORICO_DUO_YELLOW, DEFAULT_COCORICO_DUO_BLUE, DEFAULT_COCORICO_DUO_YELLOW], center: "#1c5d9d", centerText: "#fff", marker: DEFAULT_COCORICO_DUO_YELLOW, glow: "rgba(242,201,76,.20)",
  },
  "rose-institut": {
    background: "linear-gradient(145deg,#eff6ff,#d8e9ff)", rim: "#f8fbff", segments: ["#184c9b", "#f8fbff", "#72a9e8", "#e9f3ff"], center: "#1554a5", centerText: "#fff", marker: "#f3a4c4", glow: "rgba(21,84,165,.18)",
  },
  classic: {
    background: "repeating-conic-gradient(from -8deg at 50% 83%,rgba(255,255,255,.14) 0deg 14deg,transparent 14deg 28deg),linear-gradient(145deg,#096fea,#003cb9)", rim: "#fff", segments: ["#003cb9", "#d7e9ff", "#003cb9", "#d7e9ff"], center: "#003cb9", centerText: "#fff", marker: "#fff", glow: "rgba(3,31,95,.28)",
  },
  "restaurant-pop": {
    background: "radial-gradient(circle at 50% 70%,#ede1ff,#fffdfa 72%)", rim: "#fff", segments: ["#3c05a0", "#fffdfa", "#3c05a0", "#fffdfa"], center: "#3c05a0", centerText: "#fff", marker: "#3c05a0", glow: "rgba(60,5,160,.17)",
  },
  "cosmic-orbit": {
    background: "radial-gradient(circle at 50% 0%,#3b2c70,#100c24 78%)", rim: "#8b6cff", segments: ["#221644", "#6e52d9", "#15122b", "#c14ee3"], center: "#211841", centerText: "#fff", marker: "#8b6cff", glow: "rgba(124,77,255,.35)",
  },
  "sunburst-festival": {
    background: "linear-gradient(145deg,#fff9df,#ffe7a1)", rim: "#fffdf2", segments: ["#f5a623", "#fff9e5", "#ec6b36", "#ffda60"], center: "#e97926", centerText: "#fff", marker: "#e97926", glow: "rgba(245,166,35,.25)",
  },
};

export function WheelTemplateThumbnail({ templateId }: { templateId: GamePageTemplateId }) {
  const style = THUMBNAIL_STYLES[templateId];
  if (!style) return null;
  const overflowingWheel = templateId === "classic";

  const wheelStyle: CSSProperties = {
    background: `conic-gradient(from -22deg, ${style.segments[0]} 0deg 45deg, ${style.segments[1]} 45deg 90deg, ${style.segments[2]} 90deg 135deg, ${style.segments[3]} 135deg 180deg, ${style.segments[0]} 180deg 225deg, ${style.segments[1]} 225deg 270deg, ${style.segments[2]} 270deg 315deg, ${style.segments[3]} 315deg 360deg)`,
    borderColor: style.rim,
    boxShadow: `0 8px 18px ${style.glow}`,
  };

  return (
    <div
      aria-hidden="true"
      data-testid={`wheel-template-thumbnail-${templateId}`}
      className="relative mb-3 flex h-28 items-center justify-center overflow-hidden rounded-xl"
      style={{ background: style.background }}
    >
      <span className="absolute -right-4 -top-8 h-28 w-28 rounded-full opacity-30 blur-2xl" style={{ backgroundColor: style.marker }} />
      <div className={`relative shrink-0 rounded-full border-[5px] ${overflowingWheel ? "absolute top-9 h-[126px] w-[126px]" : "h-[88px] w-[88px]"}`} style={wheelStyle}>
        <span
          className="absolute -top-[9px] left-1/2 z-10 h-[19px] w-[18px] -translate-x-1/2"
          style={{ backgroundColor: style.marker, clipPath: "polygon(8% 0,92% 0,50% 100%)", filter: "drop-shadow(0 2px 2px rgba(15,23,42,.28))" }}
        />
        <span
          className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-white text-[6px] font-extrabold tracking-wide shadow-md"
          style={{ backgroundColor: style.center, color: style.centerText }}
        >
          JOUER
        </span>
      </div>
    </div>
  );
}
