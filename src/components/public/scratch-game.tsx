"use client";

import { useEffect, useRef, useState } from "react";

type ScratchGameProps = {
  accent: {
    ink: string;
    paper: string;
    signal: string;
  };
  resultLabel: string;
  enabled: boolean;
  onReveal: () => void;
};

export function ScratchGame({
  accent,
  resultLabel,
  enabled,
  onReveal,
}: ScratchGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const checksRef = useRef(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    context.globalCompositeOperation = "source-over";
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#131824";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = accent.signal;
    context.font = "800 28px sans-serif";
    context.fillText("GRATTEZ", 26, 52);
    context.fillStyle = "#d7dbee";
    context.font = "500 14px sans-serif";
    context.fillText("Révélez votre récompense", 26, 78);
    checksRef.current = 0;
    setRevealed(false);
  }, [accent.signal, resultLabel]);

  function reveal() {
    if (revealed) {
      return;
    }

    setRevealed(true);
    onReveal();
  }

  function scratch(x: number, y: number) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context || !enabled) {
      return;
    }

    context.globalCompositeOperation = "destination-out";
    context.beginPath();
    context.arc(x, y, 24, 0, Math.PI * 2);
    context.fill();
    checksRef.current += 1;

    if (checksRef.current % 12 !== 0) {
      return;
    }

    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let cleared = 0;

    for (let index = 3; index < data.length; index += 16) {
      if (data[index] === 0) {
        cleared += 1;
      }
    }

    const ratio = cleared / (data.length / 16);

    if (ratio > 0.34) {
      reveal();
    }
  }

  function getCoordinates(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  return (
    <div className="mx-auto w-full max-w-[360px]">
      <div className="relative overflow-hidden rounded-[34px] border border-white/12 bg-white/6 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.28)] backdrop-blur">
        <div className="absolute inset-x-12 top-3 h-12 rounded-full bg-white/18 blur-2xl" />
        <div
          className="relative rounded-[28px] p-5"
          style={{
            background: `linear-gradient(180deg, ${accent.paper}, ${accent.paper}dd)`,
            color: accent.ink,
          }}
        >
          <p className="text-[11px] uppercase tracking-[0.24em] text-black/44">Ticket à gratter</p>
          <h3 className="mt-3 text-3xl font-semibold leading-none">{resultLabel}</h3>
          <p className="mt-3 text-sm leading-6 text-black/55">
            Glissez le doigt pour révéler immédiatement le résultat.
          </p>
        </div>

        {!revealed ? (
          <canvas
            ref={canvasRef}
            width={320}
            height={180}
            className="absolute inset-x-4 bottom-4 top-[112px] h-[180px] w-[calc(100%-2rem)] touch-none rounded-[26px]"
            onPointerDown={(event) => {
              if (!enabled) {
                return;
              }

              isDrawingRef.current = true;
              const point = getCoordinates(event);
              scratch(point.x, point.y);
            }}
            onPointerMove={(event) => {
              if (!isDrawingRef.current || !enabled) {
                return;
              }

              const point = getCoordinates(event);
              scratch(point.x, point.y);
            }}
            onPointerUp={() => {
              isDrawingRef.current = false;
            }}
            onPointerLeave={() => {
              isDrawingRef.current = false;
            }}
          />
        ) : null}
      </div>

      <button
        type="button"
        onClick={reveal}
        disabled={!enabled || revealed}
        className="mt-6 w-full rounded-[22px] border border-[#111827] bg-[#111827] px-5 py-4 text-sm font-semibold text-white transition disabled:opacity-60"
      >
        {revealed ? "Résultat révélé" : "Révéler directement"}
      </button>
    </div>
  );
}
