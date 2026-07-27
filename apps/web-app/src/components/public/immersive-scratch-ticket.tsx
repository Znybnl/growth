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
  headingFontClass?: string;
  headingFontSize?: string;
  headingFontWeight?: number;
  headingAlignmentClass?: string;
  logoAlignmentClass?: string;
  logoBottomSpacingPx?: number;
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
  headingFontClass,
  headingFontWeight = 600,
  headingAlignmentClass = "text-center",
  logoAlignmentClass = "justify-center",
  logoBottomSpacingPx = 32,
  logoWidthPx = 170,
  headingFontSize = "32px",
}: ImmersiveScratchTicketProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const revealedRef = useRef(false);
  const checksRef = useRef(0);
  const [revealed, setRevealed] = useState(false);
  const isVault = template === "scratch-vault";
  const isConfetti = template === "scratch-confetti";
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
  const ticketBaseColor = isLilac ? "#b85be5" : isVault ? "#171d38" : primary;
  const illustrationColor = blendWithWhite(ticketBaseColor, 0.48);
  const defaultInk = isVault || isConfetti
    ? "#f8fbff"
    : isLilac
      ? "#4c1d95"
      : isSunburst
        ? "#3b2500"
        : "#111827";
  const ink = headingTextColor || defaultInk;
  const resolvedHeadingFontClass = headingFontClass || (isLilac ? "font-fredoka" : "font-display");
  const displayHeadline = headline?.trim() || (isSunburst ? "Bravo ! Vous avez gagné un ticket" : "Grattez pour révéler votre gain");
  const instruction = "Grattez la carte pour révéler votre cadeau.";

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
    const cover = isLilac ? "#b85be5" : isVault ? "#171d38" : primary;
    const highlight = isLilac ? "#e2a7fa" : isSunburst ? blendWithWhite(cover, 0.2) : blendWithWhite(cover, 0.34);
    gradient.addColorStop(0, cover);
    gradient.addColorStop(0.42, highlight);
    gradient.addColorStop(0.72, cover);
    gradient.addColorStop(1, isSunburst ? blendWithWhite(cover, 0.04) : blendWithWhite(cover, 0.08));
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

  const rootClass = isVault || isConfetti
    ? "bg-transparent px-5 pt-4"
    : isLilac
      ? "bg-transparent px-6 pt-4"
      : isCoral
        ? "bg-transparent px-5 pt-4"
        : isSunburst
          ? "bg-transparent px-0 pt-4"
          : "bg-[#111936] px-5 pt-4";

  return (
    <div className="mx-auto w-full max-w-[370px]">
      <div className={`relative overflow-hidden ${rootClass}`}>
        <div className={`relative z-10 ${headingAlignmentClass}`}>
          {logoMode !== "none" ? (
            <div className={`flex ${logoAlignmentClass}`} style={{ marginBottom: `${Math.max(0, logoBottomSpacingPx)}px` }}>
              <BrandMark
                logoText={logoText || "Votre commerce"}
                logoUrl={logoMode === "image" ? logoUrl : undefined}
                size="sm"
                variant="transparent"
                imageWidthPx={Math.min(logoWidthPx, 280)}
                textClassName="text-2xl"
                textColor={ink}
              />
            </div>
          ) : null}
          <h2
            className={`text-2xl leading-[1.08] ${resolvedHeadingFontClass}`}
            style={{ color: ink, fontSize: headingFontSize, fontWeight: headingFontWeight }}
          >
            {displayHeadline}
          </h2>
          <p
            className={`mx-auto mt-9 max-w-[270px] text-sm leading-5 ${headingAlignmentClass}`}
            style={{ color: withAlpha(ink, isVault || isConfetti ? "e0" : "d9") }}
          >
            {instruction}
          </p>
        </div>

        <div className={`relative z-10 mx-auto mt-8 overflow-hidden rounded-[26px] ${surfaceClass}`}>
          {!revealed ? (
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 z-30 flex items-center justify-center ${isSunburst ? "p-6" : "p-5"}`}
            >
              {isLilac ? <GiftIllustration color={illustrationColor} /> : null}
              {!isLilac && !isCoral && !isSunburst ? <GiftIllustration color={illustrationColor} /> : null}
              {isSunburst ? <ScratchMark color={illustrationColor} /> : null}
            </div>
          ) : null}
          {!revealed ? (
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              aria-label={instruction}
              className={`relative z-20 block h-full w-full touch-none cursor-crosshair ${isSunburst ? "opacity-100" : "opacity-[0.78]"}`}
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

        <p
          className="relative z-10 mt-4 text-center text-sm leading-5"
          style={{ color: withAlpha(ink, isVault || isConfetti ? "d9" : "c7") }}
        >
          {isCoral ? "Le gain sera disponible selon les conditions de retrait." : isSunburst ? "Votre gain sera confirmé après la révélation." : "Le résultat apparaît dès que la zone est suffisamment grattée."}
        </p>
      </div>
    </div>
  );
}
