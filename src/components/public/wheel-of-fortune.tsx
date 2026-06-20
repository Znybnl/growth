"use client";

import { useEffect, useState } from "react";

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
  buttonEnabled?: boolean;
  buttonLabel?: string;
  onButtonClick?: () => void;
  onSpinEnd?: () => void;
};

const SVG_SIZE = 640;
const CENTER = SVG_SIZE / 2;
const OUTER_RADIUS = 304;
const INNER_RADIUS = 62;

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

function readableTextColor(fill: string, fallback: string) {
  const hex = fill.replace("#", "");

  if (hex.length !== 6) {
    return fallback;
  }

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.68 ? "#111827" : "#ffffff";
}

export function WheelOfFortune({
  accent,
  wheelStyle,
  segments,
  winningSegmentId,
  canSpin = false,
  buttonEnabled = false,
  buttonLabel = "JOUER",
  onButtonClick,
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
    loseColor: wheelStyle?.loseColor ?? "#edf2f7",
    alternateLoseColor: wheelStyle?.alternateLoseColor ?? "#ffffff",
  };

  useEffect(() => {
    if (!isSpinning || !onSpinEnd) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsSpinning(false);
      setHasSpun(true);
      onSpinEnd();
    }, 4400);

    return () => window.clearTimeout(timeout);
  }, [isSpinning, onSpinEnd]);

  function handleCentralButton() {
    if (isSpinning || hasSpun || !buttonEnabled) {
      return;
    }

    if (!canSpin) {
      onButtonClick?.();
      return;
    }

    const centerOffset = targetIndex * segmentAngle + segmentAngle / 2;
    const randomJitter = (Math.random() - 0.5) * Math.min(7, segmentAngle * 0.14);
    const finalRotation = 360 * 6 + (360 - centerOffset) + randomJitter;

    setRotation(finalRotation);
    setIsSpinning(true);
  }

  return (
    <div className="relative mx-auto h-[520px] w-full max-w-[480px] overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-6 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-white/35 blur-3xl" />

      <div className="absolute left-1/2 top-[72px] h-[620px] w-[620px] -translate-x-1/2">
        <div
          className="absolute inset-0 rounded-full shadow-[0_28px_70px_rgba(15,23,42,0.18)] transition-transform duration-[4200ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <svg
            viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
            className="h-full w-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="okado-wheel-gloss" cx="50%" cy="28%" r="68%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="54%" stopColor="#ffffff" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.08" />
              </radialGradient>
            </defs>
            <circle cx={CENTER} cy={CENTER} r="314" fill="rgba(255,255,255,0.34)" />
            <circle cx={CENTER} cy={CENTER} r="306" fill="rgba(255,255,255,0.50)" />
            {segments.map((segment, index) => {
              const startAngle = index * segmentAngle + 1.2;
              const endAngle = startAngle + segmentAngle - 2.4;
              const midAngle = startAngle + (endAngle - startAngle) / 2;
              const textPoint = polarToCartesian(195, midAngle);
              const fillColor =
                segment.tone === "win"
                  ? index % 2 === 0
                    ? colors.winColor
                    : colors.alternateWinColor
                  : index % 2 === 0
                    ? colors.loseColor
                    : colors.alternateLoseColor;
              const textColor = readableTextColor(fillColor, segment.tone === "win" ? accent.ink : "#111827");

              return (
                <g key={segment.id}>
                  <path
                    d={describeSlice(startAngle, endAngle)}
                    fill={fillColor}
                    stroke="rgba(255,255,255,0.92)"
                    strokeWidth="8"
                    strokeLinejoin="round"
                  />
                  <path
                    d={describeSlice(startAngle, endAngle)}
                    fill="url(#okado-wheel-gloss)"
                    opacity="0.5"
                  />
                  <text
                    x={textPoint.x}
                    y={textPoint.y}
                    fill={textColor}
                    fontSize="24"
                    fontWeight="850"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${midAngle + 90} ${textPoint.x} ${textPoint.y})`}
                  >
                    {segment.label}
                  </text>
                </g>
              );
            })}
            <circle cx={CENTER} cy={CENTER} r="70" fill="#ffffff" opacity="0.94" />
          </svg>
        </div>

        <div className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2">
          <div
            className="h-0 w-0 border-x-[42px] border-b-[210px] border-x-transparent drop-shadow-[0_18px_22px_rgba(15,23,42,0.18)]"
            style={{ borderBottomColor: colors.rimColor }}
          />
          <div className="absolute bottom-4 left-1/2 h-7 w-7 -translate-x-1/2 rounded-full bg-white shadow-[0_3px_10px_rgba(15,23,42,0.18)]" />
        </div>

        <button
          type="button"
          onClick={handleCentralButton}
          disabled={!buttonEnabled || isSpinning || hasSpun}
          className="absolute left-1/2 top-1/2 z-10 flex h-[104px] w-[104px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[8px] border-white/75 text-[19px] font-black uppercase text-white shadow-[0_18px_36px_rgba(15,23,42,0.22)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-75"
          style={{
            background:
              buttonEnabled && !hasSpun
                ? `linear-gradient(180deg, ${accent.signal}, ${colors.rimColor})`
                : "linear-gradient(180deg, #aeb8c7, #7f8a9d)",
          }}
        >
          {isSpinning ? "..." : buttonLabel}
        </button>
      </div>
    </div>
  );
}
