import { Pointer } from "lucide-react";
import type { CSSProperties } from "react";
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
    background: "linear-gradient(145deg,#eef6ff,#fff8dc)", rim: "#fff", segments: ["#2874bb", "#fff8df", "#f4c14a", "#f8fbff"], center: "#1c5d9d", centerText: "#fff", marker: "#f4c14a", glow: "rgba(244,193,74,.20)",
  },
  "rose-institut": {
    background: "linear-gradient(145deg,#eff6ff,#d8e9ff)", rim: "#f8fbff", segments: ["#184c9b", "#f8fbff", "#72a9e8", "#e9f3ff"], center: "#1554a5", centerText: "#fff", marker: "#f3a4c4", glow: "rgba(21,84,165,.18)",
  },
  classic: {
    background: "linear-gradient(145deg,#f5f7fc,#e8edf7)", rim: "#fff", segments: ["#1b2842", "#ffffff", "#506181", "#eef2f8"], center: "#1b2842", centerText: "#fff", marker: "#1b2842", glow: "rgba(27,40,66,.16)",
  },
  "restaurant-pop": {
    background: "linear-gradient(145deg,#fff6dd,#fbe6a2)", rim: "#fff8e7", segments: ["#f4c14a", "#1b2842", "#fff5d8", "#a778eb"], center: "#1b2842", centerText: "#fff", marker: "#f4c14a", glow: "rgba(159,105,30,.2)",
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
      <div className="relative h-[88px] w-[88px] rounded-full border-[5px]" style={wheelStyle}>
        <span
          className="absolute -top-[7px] left-1/2 z-10 h-[18px] w-[16px] -translate-x-1/2 rounded-b-[10px]"
          style={{ backgroundColor: style.marker, clipPath: "polygon(50% 100%,0 0,100% 0)" }}
        />
        <span
          className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-white/90 text-[5px] font-bold tracking-wide"
          style={{ backgroundColor: style.center, color: style.centerText }}
        >
          <Pointer className="h-3.5 w-3.5" strokeWidth={2.2} />
          JOUER
        </span>
      </div>
    </div>
  );
}
