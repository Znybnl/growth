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
  onScratchStart?: () => void;
};

export function ScratchGame({
  accent,
  resultLabel,
  enabled,
  onReveal,
  onScratchStart,
}: ScratchGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const checksRef = useRef(0);
  const scratchStartedRef = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const [hasTouched, setHasTouched] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    context.globalCompositeOperation = "source-over";
    context.clearRect(0, 0, canvas.width, canvas.height);
    const foilGradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    foilGradient.addColorStop(0, "#6b4305");
    foilGradient.addColorStop(0.2, "#b87912");
    foilGradient.addColorStop(0.46, "#f4ce68");
    foilGradient.addColorStop(0.7, "#a96608");
    foilGradient.addColorStop(1, "#5b3503");
    context.fillStyle = foilGradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    checksRef.current = 0;
    scratchStartedRef.current = false;
    setRevealed(false);
    setHasTouched(false);
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
      <div className="relative overflow-hidden rounded-[26px] border border-[#6e4306]/70 shadow-[0_24px_46px_rgba(78,47,4,0.32)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "linear-gradient(115deg, rgba(255,255,255,0.28), transparent 24%, transparent 66%, rgba(255,255,255,0.16)), repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 5px)",
          }}
        />
        <div
          className="relative h-[208px] overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #7a4a05 0%, #b8750b 34%, #6d4004 68%, #a96808 100%)",
          }}
        >
          {hasTouched ? (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
              <p
                className="max-w-[90%] font-semibold leading-[1.05] text-[#fff8e7]"
                style={{
                  fontSize: "clamp(2rem, 8vw, 3rem)",
                  textShadow: "0 2px 10px rgba(31, 17, 0, 0.72)",
                }}
              >
                {resultLabel}
              </p>
            </div>
          ) : null}

          {!revealed ? (
            <canvas
              ref={canvasRef}
              width={320}
              height={208}
              className="absolute inset-0 h-full w-full touch-none"
              onPointerDown={(event) => {
                if (!enabled) {
                  return;
                }

                isDrawingRef.current = true;
                setHasTouched(true);
                if (!scratchStartedRef.current) {
                  scratchStartedRef.current = true;
                  onScratchStart?.();
                }
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
      </div>
    </div>
  );
}
