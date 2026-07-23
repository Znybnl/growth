"use client";

import { useEffect, useRef, useState } from "react";

type ImmersiveScratchTicketProps = {
  accent: {
    ink: string;
    paper: string;
    signal: string;
  };
  resultLabel: string;
  enabled: boolean;
  onReveal: () => void;
  template: "scratch-vault" | "scratch-confetti";
};

const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 336;

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

export function ImmersiveScratchTicket({
  accent,
  resultLabel,
  enabled,
  onReveal,
  template,
}: ImmersiveScratchTicketProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const revealedRef = useRef(false);
  const checksRef = useRef(0);
  const [revealed, setRevealed] = useState(false);
  const isVault = template === "scratch-vault";
  const primary = accent.signal;
  const secondary = accent.ink;
  const coverColor = isVault ? "#161b34" : primary;
  const coverTextColor = isVault ? "#ffffff" : readableTextColor(primary);
  const foilHighlight = isVault ? withAlpha(primary, "d9") : blendWithWhite(primary, 0.35);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const gradient = context.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    gradient.addColorStop(0, coverColor);
    gradient.addColorStop(0.4, foilHighlight);
    gradient.addColorStop(0.72, coverColor);
    gradient.addColorStop(1, isVault ? "#071126" : blendWithWhite(primary, 0.1));
    context.globalCompositeOperation = "source-over";
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.fillStyle = gradient;
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    context.save();
    context.globalAlpha = isVault ? 0.32 : 0.2;
    context.strokeStyle = coverTextColor;
    context.lineWidth = 2;
    for (let offset = -CANVAS_HEIGHT; offset < CANVAS_WIDTH; offset += 34) {
      context.beginPath();
      context.moveTo(offset, 0);
      context.lineTo(offset + CANVAS_HEIGHT, CANVAS_HEIGHT);
      context.stroke();
    }
    context.restore();

    context.fillStyle = coverTextColor;
    context.textAlign = "center";
    context.font = "700 43px Anton, sans-serif";
    context.fillText(isVault ? "GRATTEZ LE COFFRE" : "GRATTEZ VOTRE CARTE", CANVAS_WIDTH / 2, 145);
    checksRef.current = 0;
    revealedRef.current = false;
    setRevealed(false);
  }, [coverColor, coverTextColor, foilHighlight, isVault, primary, resultLabel]);

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
    context.arc(x, y, 34, 0, Math.PI * 2);
    context.fill();
    checksRef.current += 1;

    if (checksRef.current % 10 !== 0) return;
    const { data } = context.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    let cleared = 0;
    for (let index = 3; index < data.length; index += 20) {
      if (data[index] === 0) cleared += 1;
    }

    if (cleared / (data.length / 20) > 0.32) reveal();
  }

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  }

  return (
    <div className="mx-auto w-full max-w-[430px]">
      <div
        className={`relative overflow-hidden rounded-[28px] border shadow-[0_28px_70px_rgba(15,23,42,0.24)] ${
          isVault ? "border-[#33426d]" : "border-[#9a650d]"
        }`}
        style={{
          background: isVault
            ? `linear-gradient(135deg, #080f24, ${withAlpha(primary, "c8")}, #070d1c)`
            : `linear-gradient(135deg, #8c5a09, ${blendWithWhite(primary, 0.2)}, #b8730b)`,
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-75"
          style={{
            background: isVault
              ? `radial-gradient(circle at 80% 10%, ${withAlpha(primary, "42")}, transparent 42%), radial-gradient(circle at 8% 92%, ${withAlpha(primary, "30")}, transparent 38%)`
              : "linear-gradient(115deg, rgba(255,255,255,0.28), transparent 24%, transparent 68%, rgba(255,255,255,0.16))",
          }}
        />

        <div className="relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <p className="text-3xl font-semibold leading-tight" style={{ color: isVault ? "#f8fbff" : secondary }}>
              {resultLabel}
            </p>
          </div>

          {!revealed ? (
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="relative block aspect-[15/7] h-auto w-full touch-none cursor-crosshair"
              onPointerDown={(event) => {
                if (!enabled) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                drawingRef.current = true;
                const point = pointFromEvent(event);
                scratch(point.x, point.y);
              }}
              onPointerMove={(event) => {
                if (!drawingRef.current || !enabled) return;
                const point = pointFromEvent(event);
                scratch(point.x, point.y);
              }}
              onPointerUp={() => {
                drawingRef.current = false;
              }}
              onPointerCancel={() => {
                drawingRef.current = false;
              }}
            />
          ) : (
            <div
              className="relative flex aspect-[15/7] items-center justify-center px-6 text-center"
              style={{ background: withAlpha(primary, "22") }}
            >
              <p className="font-display text-2xl font-semibold" style={{ color: isVault ? "#f8fbff" : secondary }}>
                Lot révélé
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
