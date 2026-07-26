"use client";

import { useEffect, useRef, useState } from "react";

import { BrandMark } from "@/components/brand-mark";

type ScratchTemplateId =
  | "scratch-vault"
  | "scratch-confetti"
  | "scratch-coral"
  | "scratch-lilac"
  | "scratch-sunburst";

type ImmersiveScratchTicketProps = {
  accent: {
    ink: string;
    paper: string;
    signal: string;
  };
  resultLabel: string;
  enabled: boolean;
  onReveal: () => void;
  onStart?: () => void;
  template: ScratchTemplateId;
  logoMode?: "none" | "image" | "text";
  logoText?: string;
  logoUrl?: string;
  headline?: string;
  headingTextColor?: string;
  logoWidthPx?: number;
};

const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 430;

function withAlpha(color: string, alpha: string) {
  const normalized = color.replace("#", "");
  return /^[0-9a-f]{6}$/i.test(normalized) ? `#${normalized}${alpha}` : color;
}

function blendWithWhite(color: string, ratio: number) {
  const normalized = color.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return "#f8fafc";

  return `#${[0, 2, 4]
    .map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16))
    .map((channel) => Math.round(channel + (255 - channel) * ratio))
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function readableTextColor(color: string) {
  const normalized = color.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return "#ffffff";
  const channels = [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
  const luminance = (0.299 * channels[0] + 0.587 * channels[1] + 0.114 * channels[2]) / 255;
  return luminance > 0.66 ? "#14213d" : "#ffffff";
}

function GiftIllustration({ color }: { color: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 220 220" className="h-full w-full">
      <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
        <path d="M46 86h128v88H46z" fill={withAlpha(color, "38")} strokeWidth="5" />
        <path d="M38 70h144v28H38z" fill={withAlpha(color, "58")} strokeWidth="5" />
        <path d="M110 70v104" strokeWidth="7" />
        <path d="M65 70c-33-34 13-53 45 0M155 70c33-34-13-53-45 0" strokeWidth="7" />
        <path d="M54 116h112M54 145h112" opacity=".42" strokeWidth="3" />
      </g>
      <g fill={color} opacity=".82">
        <circle cx="28" cy="46" r="5" />
        <circle cx="194" cy="49" r="4" />
        <path d="m26 126 7-14 7 14-7 14zM184 130l6-12 6 12-6 12z" />
      </g>
    </svg>
  );
}

function HandIllustration({ color }: { color: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 220 220" className="h-full w-full">
      <path
        d="M112 180c-14-4-25-13-34-26l-29-42c-5-8-2-18 6-22 6-3 13-1 17 4l18 23V55c0-9 7-16 16-16s16 7 16 16v39l6-9c5-8 16-10 23-4 4 3 7 8 7 13v34l-4 17c-5 21-22 38-42 43Z"
        fill={color}
        opacity=".95"
      />
      <path d="M104 55v52M136 103V82M166 128v-29" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
      <path d="M89 42c11-16 22-22 34-22" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" opacity=".5" />
    </svg>
  );
}

function ScratchMark({ color }: { color: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 420 230" className="h-full w-full">
      <path
        d="M46 168c14-70 46-97 70-43 17 38 16 85 36 76 24-11 1-130 31-155 24-20 33 38 39 78 7 49 25 62 42 34 24-42 25-108 50-103 31 6 2 104 24 113 20 8 31-23 43-45"
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray="2 15"
      />
      <path d="M205 32c10 9 18 20 23 35" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" opacity=".65" />
    </svg>
  );
}

export function ImmersiveScratchTicket({
  accent,
  resultLabel,
  enabled,
  onReveal,
  onStart,
  template,
  logoMode = "text",
  logoText,
  logoUrl,
  headline,
  headingTextColor,
  logoWidthPx = 170,
}: ImmersiveScratchTicketProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const revealedRef = useRef(false);
  const checksRef = useRef(0);
  const [revealed, setRevealed] = useState(false);
  const isVault = template === "scratch-vault";
  const isCoral = template === "scratch-coral";
  const isLilac = template === "scratch-lilac";
  const isSunburst = template === "scratch-sunburst";
  const configuredPrimary = accent.signal;
  const primary =
    configuredPrimary.toLowerCase() === "#f4c14a"
      ? isCoral
        ? "#f97316"
        : isLilac
          ? "#a855f7"
          : isSunburst
            ? "#f59e0b"
            : configuredPrimary
      : configuredPrimary;
  const ink = isSunburst ? "#3b2500" : accent.ink;
  const displayHeadline = headline?.trim() || (isSunburst ? "Bravo ! Vous avez gagné un ticket" : "Grattez pour révéler votre gain");
  const instruction = isLilac
    ? "Grattez la carte pour révéler votre cadeau"
    : isCoral
      ? "Grattez pour voir votre récompense"
      : isSunburst
        ? "Grattez pour révéler ce que vous avez gagné !"
        : "Grattez le ticket pour découvrir votre gain";

  const surfaceClass = isSunburst
    ? "aspect-[1.18/1] w-full"
    : isCoral
      ? "aspect-square w-full"
      : "aspect-square w-full max-w-[248px]";

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const gradient = context.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const cover = isLilac ? "#b85be5" : isCoral ? primary : isSunburst ? "#ffe28a" : isVault ? "#171d38" : primary;
    const highlight = isLilac ? "#e2a7fa" : isSunburst ? "#fff7d3" : blendWithWhite(cover, 0.34);
    gradient.addColorStop(0, cover);
    gradient.addColorStop(0.42, highlight);
    gradient.addColorStop(0.72, cover);
    gradient.addColorStop(1, isSunburst ? "#f7b50b" : blendWithWhite(cover, 0.08));
    context.globalCompositeOperation = "source-over";
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.fillStyle = gradient;
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    context.save();
    context.globalAlpha = isSunburst ? 0.14 : 0.18;
    context.strokeStyle = isLilac || isSunburst ? "#ffffff" : readableTextColor(primary);
    context.lineWidth = 2;
    for (let offset = -CANVAS_HEIGHT; offset < CANVAS_WIDTH; offset += isSunburst ? 28 : 34) {
      context.beginPath();
      context.moveTo(offset, 0);
      context.lineTo(offset + CANVAS_HEIGHT, CANVAS_HEIGHT);
      context.stroke();
    }
    context.restore();
    checksRef.current = 0;
    revealedRef.current = false;
    setRevealed(false);
  }, [isCoral, isLilac, isSunburst, isVault, primary, resultLabel]);

  function reveal() {
    if (revealedRef.current) return;
    revealedRef.current = true;
    setRevealed(true);
    onReveal();
  }

  function scratch(x: number, y: number) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !enabled || revealedRef.current) return;

    context.globalCompositeOperation = "destination-out";
    context.beginPath();
    context.arc(x, y, isSunburst ? 28 : 32, 0, Math.PI * 2);
    context.fill();
    checksRef.current += 1;
    if (checksRef.current % 9 !== 0) return;

    const { data } = context.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    let cleared = 0;
    for (let index = 3; index < data.length; index += 20) {
      if (data[index] === 0) cleared += 1;
    }
    if (cleared / (data.length / 20) > 0.3) reveal();
  }

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  }

  const rootClass = isLilac
    ? "rounded-[42px] border-[7px] border-[#1d1721] bg-[#fbf0ff] px-6 pb-8 pt-7 shadow-[0_28px_70px_rgba(84,42,112,0.22)]"
    : isCoral
      ? "rounded-[28px] border border-[#e8e9ef] bg-white px-5 pb-6 pt-7 shadow-[0_24px_60px_rgba(31,41,55,0.12)]"
      : isSunburst
        ? "rounded-[34px] border border-[#d97706]/60 bg-[#ffbe18] px-5 pb-8 pt-8 shadow-[0_26px_65px_rgba(180,101,0,0.28)]"
        : "rounded-[30px] border border-[#33426d] bg-[#111936] px-5 pb-6 pt-6 shadow-[0_28px_70px_rgba(15,23,42,0.24)]";

  const logoColor = isLilac || isSunburst ? ink : headingTextColor;

  return (
    <div className="mx-auto w-full max-w-[370px]">
      <div className={`relative overflow-hidden ${rootClass}`}>
        {isSunburst ? (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-70" style={{ background: `repeating-conic-gradient(from -18deg at 50% -4%, rgba(255,255,255,.2) 0deg 12deg, transparent 12deg 24deg)` }} />
        ) : null}
        <div className="relative z-10 text-center">
          <div className="flex justify-center">
            <BrandMark
              logoText={logoText || "Votre commerce"}
              logoUrl={logoMode === "image" ? logoUrl : undefined}
              size="sm"
              variant="transparent"
              imageWidthPx={Math.min(logoWidthPx, 180)}
              textColor={logoColor}
            />
          </div>
          <h2 className={`mt-5 text-2xl font-semibold leading-[1.08] ${isLilac ? "font-fredoka" : "font-display"}`} style={{ color: logoColor }}>
            {displayHeadline}
          </h2>
          <p className="mx-auto mt-3 max-w-[270px] text-sm leading-5" style={{ color: isLilac || isSunburst ? withAlpha(ink, "b8") : withAlpha(headingTextColor || "#ffffff", "b8") }}>
            {instruction}
          </p>
        </div>

        <div className={`relative z-10 mx-auto mt-7 overflow-hidden rounded-[26px] ${surfaceClass}`}>
          <div className="absolute inset-0 flex items-center justify-center p-5">
            {isLilac ? <GiftIllustration color="#7e2bb2" /> : null}
            {isCoral ? <HandIllustration color="#ffffff" /> : null}
            {isSunburst ? <ScratchMark color="#ffffff" /> : null}
            {!isLilac && !isCoral && !isSunburst ? <GiftIllustration color={primary} /> : null}
          </div>
          {!revealed ? (
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              aria-label={instruction}
              className="relative z-20 block h-full w-full touch-none cursor-crosshair"
              onPointerDown={(event) => {
                if (!enabled) {
                  onStart?.();
                  return;
                }
                event.currentTarget.setPointerCapture(event.pointerId);
                drawingRef.current = true;
                scratch(...Object.values(pointFromEvent(event)) as [number, number]);
              }}
              onPointerMove={(event) => {
                if (!drawingRef.current || !enabled) return;
                scratch(...Object.values(pointFromEvent(event)) as [number, number]);
              }}
              onPointerUp={() => {
                drawingRef.current = false;
              }}
              onPointerCancel={() => {
                drawingRef.current = false;
              }}
            />
          ) : (
            <div className="relative z-30 flex h-full w-full items-center justify-center bg-white/78 p-6 text-center backdrop-blur-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
                  Votre gain
                </p>
                <p className="mt-3 text-2xl font-semibold" style={{ color: ink }}>
                  {resultLabel}
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="relative z-10 mt-5 text-center text-xs leading-5" style={{ color: isLilac || isSunburst ? withAlpha(ink, "b0") : "rgba(255,255,255,.68)" }}>
          {isCoral ? "Le gain sera disponible selon les conditions de retrait." : isSunburst ? "Votre gain sera confirmé après la révélation." : "Le résultat apparaît dès que la zone est suffisamment grattée."}
        </p>
      </div>
    </div>
  );
}
