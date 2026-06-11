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
const INNER_RADIUS = 34;

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
      Array.from({ length: 22 }, (_, index) => {
        const angle = (360 / 22) * index;
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
    const randomJitter = (Math.random() - 0.5) * Math.min(8, segmentAngle * 0.18);
    const finalRotation = 360 * 6 + (360 - centerOffset) + randomJitter;

    setRotation(finalRotation);
    setIsSpinning(true);
  }

  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <div className="absolute inset-x-6 top-0 h-16 rounded-full bg-white/16 blur-2xl" />
      <div
        className="relative mx-auto aspect-square w-full rounded-full border-[14px] shadow-[0_28px_90px_rgba(0,0,0,0.35)]"
        style={{
          borderColor: colors.rimColor,
          backgroundColor: "#10131a",
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
              r="7"
              fill={index % 2 === 0 ? "#fff3c9" : "#ffffff"}
              opacity={0.95}
            />
          ))}
        </svg>

        <div
          className="absolute inset-[18px] rounded-full transition-transform duration-[4200ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
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
              const textPoint = polarToCartesian(118, midAngle);
              const isFlipped = midAngle > 90 && midAngle < 270;
              const textRotation = isFlipped ? midAngle + 180 : midAngle;

              return (
                <g key={segment.id}>
                  <path
                    d={describeSlice(startAngle, endAngle)}
                    fill={
                      segment.tone === "win"
                        ? index % 2 === 0
                          ? colors.winColor
                          : colors.alternateWinColor
                        : index % 2 === 0
                          ? colors.loseColor
                          : colors.alternateLoseColor
                    }
                    stroke="#10131a"
                    strokeWidth="4"
                  />
                  <text
                    x={textPoint.x}
                    y={textPoint.y}
                    fill={segment.tone === "win" ? accent.ink : "white"}
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
            <circle cx={CENTER} cy={CENTER} r="36" fill="#ffffff" opacity="0.98" />
            <circle cx={CENTER} cy={CENTER} r="16" fill={colors.rimColor} />
          </svg>
        </div>

        <div className="absolute left-1/2 top-1.5 -translate-x-1/2">
          <div
            className="h-0 w-0 border-x-[18px] border-b-[34px] border-x-transparent"
            style={{ borderBottomColor: colors.rimColor }}
          />
          <div
            className="mx-auto -mt-1.5 h-5 w-5 rounded-full border-4 bg-white"
            style={{ borderColor: colors.rimColor }}
          />
        </div>
      </div>

      {canSpin ? (
        <button
          type="button"
          onClick={spinWheel}
          disabled={isSpinning || hasSpun}
          className="mt-6 w-full rounded-[22px] border px-5 py-4 text-sm font-semibold text-white transition disabled:opacity-60"
          style={{
            backgroundColor: "#111827",
            borderColor: "#111827",
          }}
        >
          {isSpinning
            ? "La roue tourne..."
            : hasSpun
              ? "Résultat révélé"
              : "Faire tourner la roue"}
        </button>
      ) : null}
    </div>
  );
}
