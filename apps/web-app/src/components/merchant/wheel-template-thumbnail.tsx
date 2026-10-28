import type { CSSProperties } from "react";
import Image from "next/image";
import { Gift, Pointer } from "lucide-react";
import { HalloweenWheelVisual } from "@/components/public/halloween-wheel-art";
import { ChristmasTemplateThumbnail } from "./christmas-template-thumbnail";
import { isChristmasWheelTemplate } from "@/lib/christmas-wheel-themes";
import { HALLOWEEN_WHEEL_BACKGROUND } from "@/lib/halloween-wheel-theme";
import { DEFAULT_COCORICO_DUO_BLUE, DEFAULT_COCORICO_DUO_YELLOW, DEFAULT_COCORICO_PRIMARY_COLOR, DEFAULT_ROSE_INSTITUT_BACKGROUND_COLOR, DEFAULT_ROSE_INSTITUT_PRIMARY_COLOR, DEFAULT_ROSE_INSTITUT_SECONDARY_COLOR, DEFAULT_ROSE_INSTITUT_TEXT_COLOR } from "@/lib/campaign-defaults";
import type { GamePageTemplateId } from "@/lib/types";
import { textFontFamily } from "@/lib/format";

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
    background: DEFAULT_COCORICO_PRIMARY_COLOR, rim: "#ffffff",
    segments: [DEFAULT_COCORICO_PRIMARY_COLOR, "#ffffff", DEFAULT_COCORICO_PRIMARY_COLOR, "#ffffff"], center: DEFAULT_COCORICO_PRIMARY_COLOR, centerText: "#fff", marker: "#0b4d91", glow: "rgba(21,84,165,.20)",
  },
  "cocorico-duo-wheel": {
    background: DEFAULT_COCORICO_DUO_BLUE, rim: "#fff", segments: [DEFAULT_COCORICO_DUO_BLUE, DEFAULT_COCORICO_DUO_YELLOW, DEFAULT_COCORICO_DUO_BLUE, DEFAULT_COCORICO_DUO_YELLOW], center: "#1c5d9d", centerText: "#fff", marker: DEFAULT_COCORICO_DUO_YELLOW, glow: "rgba(242,201,76,.20)",
  },
  "rose-institut": {
    background: DEFAULT_ROSE_INSTITUT_BACKGROUND_COLOR, rim: "#ffffff", segments: [DEFAULT_ROSE_INSTITUT_PRIMARY_COLOR, DEFAULT_ROSE_INSTITUT_SECONDARY_COLOR, DEFAULT_ROSE_INSTITUT_PRIMARY_COLOR, DEFAULT_ROSE_INSTITUT_SECONDARY_COLOR], center: DEFAULT_ROSE_INSTITUT_TEXT_COLOR, centerText: "#fff", marker: "#e78ab0", glow: "rgba(222,103,151,.18)",
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

/** Static composition of the public Modern wheel: blue/white sectors, gifts,
 * blue ring, rounded white pointer and hand in the center. No nested button. */
function ModernThumbnailWheel() {
  return <svg data-testid="modern-thumbnail-wheel" viewBox="0 0 128 132" className="absolute -bottom-5 -right-3 h-32 w-32 overflow-visible" aria-hidden="true">
    <circle cx="64" cy="68" r="60" fill="white" />
    <circle cx="64" cy="68" r="57" fill="none" stroke="#073f78" strokeWidth="1.6" />
    {Array.from({ length: 8 }, (_, index) => {
      const start = (index * 45 - 90) * Math.PI / 180;
      const end = start + Math.PI / 4;
      const mid = start + Math.PI / 8;
      const fill = index % 2 === 0 ? DEFAULT_COCORICO_PRIMARY_COLOR : "#ffffff";
      return <g key={index}>
        <path d={`M64 68 L${64 + 54 * Math.cos(start)} ${68 + 54 * Math.sin(start)} A54 54 0 0 1 ${64 + 54 * Math.cos(end)} ${68 + 54 * Math.sin(end)} Z`} fill={fill} stroke="white" strokeWidth="1.6" />
        <Gift x={64 + 40 * Math.cos(mid) - 5} y={68 + 40 * Math.sin(mid) - 5} width="10" height="10" color={index % 2 === 0 ? "white" : "#073f78"} strokeWidth="2" />
      </g>;
    })}
    <circle cx="64" cy="68" r="19" fill="white" stroke="#073f78" strokeWidth="2" />
    <circle cx="64" cy="68" r="15" fill={DEFAULT_COCORICO_PRIMARY_COLOR} />
    <Pointer x="55" y="59" width="18" height="18" color="white" strokeWidth="2.8" />
    <path d="M57 3 Q53 3 55 9 L62 30 Q64 35 66 30 L73 9 Q75 3 71 3Z" fill="#0b4d91" stroke="white" strokeWidth="3" strokeLinejoin="round" />
  </svg>;
}

export function WheelTemplateThumbnail({ templateId, card = false }: { templateId: GamePageTemplateId; card?: boolean }) {
  if (isChristmasWheelTemplate(templateId)) return <ChristmasTemplateThumbnail templateId={templateId} card={card} />;
  if (templateId === "halloween-gold") return <div aria-hidden="true" data-testid="wheel-template-thumbnail-halloween-gold" className={`relative overflow-hidden bg-black ${card ? "h-full px-4 pt-3" : "mb-3 flex h-28 items-center justify-center rounded-xl"}`}>
    <Image src={HALLOWEEN_WHEEL_BACKGROUND} alt="" fill sizes="220px" className="object-cover" />
    {card ? <div className="relative z-10 max-w-[44%] text-[#f8f6ef]"><div className="min-h-[20px] text-[8px] font-semibold uppercase leading-[1.15] tracking-[0.06em]">Votre établissement</div><div data-testid="template-sample-heading" className="mt-3 font-cormorant text-[20px] leading-[1.05] text-[#ecac52]">Tournez<br />la roue</div><div className="mt-2 font-serif text-[8px] leading-[1.35] text-[#ecac52]">Une surprise exclusive vous attend — Spécial Halloween</div></div> : null}
    <div className={card ? "absolute -bottom-4 -right-3 w-32" : "relative w-[94px] pt-2"}><HalloweenWheelVisual segments={Array.from({ length: 6 }, (_, index) => ({ id: `thumbnail-${index}`, label: "Cadeau", tone: "win" as const }))} interactive={false} /></div>
  </div>;
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
      className={`relative overflow-hidden ${card ? "h-full px-4 pt-3" : "mb-3 flex h-28 items-center justify-center rounded-xl"}`}
      style={{ background: style.background }}
    >
      <span className="absolute -right-4 -top-8 h-28 w-28 rounded-full opacity-30 blur-2xl" style={{ backgroundColor: style.marker }} />
      {card ? <div className="relative z-10 max-w-[44%]" style={{ color: templateId === "classic" || templateId === "cocorico-wheel" || templateId === "cosmic-orbit" ? "#ffffff" : style.center }}>
        <div className="min-h-[20px] text-[8px] font-semibold uppercase leading-[1.15] tracking-[0.06em]">Votre établissement</div>
        <div data-testid="template-sample-heading" className="mt-3 text-[18px] font-bold leading-[1.08]" style={{ fontFamily: textFontFamily(templateId === "classic" ? "poppins" : templateId === "restaurant-pop" ? "lato" : templateId === "rose-institut" ? "playfair" : "fredoka") }}>Jouez &amp;<br />gagnez</div>
        <div data-testid="template-sample-subtitle" className="mt-2 text-[8px] leading-[1.35] opacity-90">De belles surprises vous attendent lors de votre prochaine visite</div>
      </div> : null}
      {card && templateId === "cocorico-wheel" ? <ModernThumbnailWheel /> : <div className={`shrink-0 rounded-full border-[5px] ${card ? "absolute -bottom-5 -right-3 h-32 w-32" : overflowingWheel ? "absolute top-9 h-[126px] w-[126px]" : "relative h-[88px] w-[88px]"}`} style={wheelStyle}>
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
      </div>}
    </div>
  );
}
