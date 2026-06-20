"use client";

import { useEffect, useMemo, useState } from "react";

type WheelSegment = {
  id: string;
  label: string;
  tone: "win" | "lose";
};

type WheelOfFortuneProps = {
  accent: {
    ink: string;
    paper: string;
    signal: string;
  };
  wheelStyle?: {
    rimColor: string;
    winColor: string;
    alternateWinColor: string;
    loseColor: string;
    alternateLoseColor: string;
  };
  segments: WheelSegment[];
  winningSegmentId: string;
  canSpin?: boolean;
  onSpinEnd?: () => void;
};

const SVG_SIZE = 420;
const CENTER = SVG_SIZE / 2;
const OUTER_RADIUS = 182;
const INNER_RADIUS = 42;

function polarToCartesian(radius: number, angleInDegrees: number) {
  const radians = ((angleInDegrees - 90) * Math.PI) / 180;
  const x = CENTER + radius * Math.cos(radians);
  const y = CENTER + radius * Math.sin(radians);

  return {
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
  };
}

function describeSlice(startAngle: number, endAngle: number) {
  const start = polarToCartesian(OUTER_RADIUS, endAngle);
  const end = polarToCartesian(OUTER_RADIUS, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  const innerEnd = polarToCartesian(INNER_RADIUS, endAngle);
  const innerStart = polarToCartesian(INNER_RADIUS, startAngle);

  return [
    `M ${innerStart.x} ${innerStart.y}`,
    `L ${end.x} ${end.y}`,
    `A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 ${largeArcFlag} 1 ${start.x} ${start.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

export function WheelOfFortune({
  accent,
  wheelStyle,
  segments,
  winningSegmentId,
  canSpin = false,
  onSpinEnd,
}: WheelOfFortuneProps) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);

  const segmentAngle = 360 / segments.length;
  const targetIndex = Math.max(
    0,
    segments.findIndex((segment) => segment.id === winningSegmentId),
  );

  const colors = {
    rimColor: wheelStyle?.rimColor ?? accent.signal,
    winColor: wheelStyle?.winColor ?? accent.signal,
    alternateWinColor: wheelStyle?.alternateWinColor ?? accent.paper,
    loseColor: wheelStyle?.loseColor ?? "#1b2842",
    alternateLoseColor: wheelStyle?.alternateLoseColor ?? "#8795db",
  };

  const lights = useMemo(
    () =>
      Array.from({ length: 20 }, (_, index) => {
        const angle = (360 / 20) * index;
        return polarToCartesian(198, angle);
      }),
    [],
  );

  useEffect(() => {
    if (!isSpinning || !onSpinEnd) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsSpinning(false);
      setHasSpun(true);
      onSpinEnd();
    }, 4600);

    return () => window.clearTimeout(timeout);
  }, [isSpinning, onSpinEnd]);

  function spinWheel() {
    if (!canSpin || isSpinning || hasSpun) {
      return;
    }

    const centerOffset = targetIndex * segmentAngle + segmentAngle / 2;
    const randomJitter = (Math.random() - 0.5) * Math.min(8, segmentAngle * 0.16);
    const finalRotation = 360 * 6 + (360 - centerOffset) + randomJitter;

    setRotation(finalRotation);
    setIsSpinning(true);
  }

  return (
    <div className="relative mx-auto w-full max-w-[390px]">
      <div className="absolute inset-x-8 top-4 h-20 rounded-full bg-white/35 blur-3xl" />
      <div className="relative overflow-visible rounded-[44px] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,246,248,0.94))] px-3 pb-4 pt-6 shadow-[0_30px_80px_rgba(22,24,33,0.16)]">
        <div className="relative mx-auto aspect-square w-full max-w-[360px]">
          <div
            className="absolute inset-0 rounded-full border-[12px] shadow-[0_22px_60px_rgba(0,0,0,0.14)]"
            style={{
              borderColor: colors.rimColor,
              background:
                "radial-gradient(circle at 50% 35%, rgba(255,255,255,0.98), rgba(241,241,244,0.98))",
            }}
          >
            <svg
              viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
              className="absolute inset-0 h-full w-full rounded-full"
            >
              {lights.map((light, index) => (
                <circle
                  key={index}
                  cx={light.x}
                  cy={light.y}
                  r="5.5"
                  fill={index % 2 === 0 ? "#ffffff" : "#fff1bf"}
                  opacity={0.95}
                />
              ))}
            </svg>

            <div
              className="absolute inset-[14px] rounded-full transition-transform duration-[4200ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              <svg
                viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
                className="h-full w-full rounded-full"
              >
                {segments.map((segment, index) => {
                  const startAngle = index * segmentAngle;
                  const endAngle = startAngle + segmentAngle;
                  const midAngle = startAngle + segmentAngle / 2;
                  const textPoint = polarToCartesian(122, midAngle);
                  const isFlipped = midAngle > 90 && midAngle < 270;
                  const textRotation = isFlipped ? midAngle + 180 : midAngle;
                  const fillColor =
                    segment.tone === "win"
                      ? index % 2 === 0
                        ? colors.winColor
                        : colors.alternateWinColor
                      : index % 2 === 0
                        ? colors.loseColor
                        : colors.alternateLoseColor;

                  return (
                    <g key={segment.id}>
                      <path
                        d={describeSlice(startAngle, endAngle)}
                        fill={fillColor}
                        stroke="rgba(255,255,255,0.78)"
                        strokeWidth="6"
                        strokeLinejoin="round"
                      />
                      <text
                        x={textPoint.x}
                        y={textPoint.y}
                        fill={segment.tone === "win" ? accent.ink : "#ffffff"}
                        fontSize="18"
                        fontWeight="800"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${textRotation} ${textPoint.x} ${textPoint.y})`}
                      >
                        {segment.label}
                      </text>
                    </g>
                  );
                })}
                <circle cx={CENTER} cy={CENTER} r="50" fill="#ffffff" opacity="0.98" />
                <circle cx={CENTER} cy={CENTER} r="24" fill={colors.rimColor} />
              </svg>
            </div>

            <div className="absolute left-1/2 top-1 -translate-x-1/2">
              <div
                className="h-0 w-0 border-x-[26px] border-b-[120px] border-x-transparent drop-shadow-[0_12px_18px_rgba(0,0,0,0.16)]"
                style={{ borderBottomColor: colors.rimColor }}
              />
              <div className="absolute bottom-2 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full bg-white/95" />
            </div>
          </div>

          <button
            type="button"
            onClick={spinWheel}
            disabled={!canSpin || isSpinning || hasSpun}
            className="absolute left-1/2 top-1/2 z-10 h-[84px] w-[84px] -translate-x-1/2 -translate-y-1/2 rounded-full text-xl font-bold text-white shadow-[0_20px_34px_rgba(255,74,160,0.38)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            style={{
              background:
                canSpin && !hasSpun
                  ? `linear-gradient(180deg, ${accent.signal}, ${accent.signal}dd)`
                  : "linear-gradient(180deg, #c7ced9, #9aa6b8)",
            }}
          >
            {isSpinning ? "..." : "Jouer"}
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#7b8090]">
            {isSpinning
              ? "La roue tourne"
              : hasSpun
                ? "Résultat révélé"
                : canSpin
                  ? "Touchez le centre pour jouer"
                  : "Préparez votre partie"}
          </p>
        </div>
      </div>
    </div>
  );
}
