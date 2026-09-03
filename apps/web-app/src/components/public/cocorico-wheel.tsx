"use client";

import { Pointer } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type WheelSegment = {
  id: string;
  label: string;
  tone: "win" | "lose";
};

type CocoricoWheelProps = {
  segments: WheelSegment[];
  winningSegmentId: string;
  canSpin?: boolean;
  buttonEnabled?: boolean;
  buttonLabel?: string;
  onButtonClick?: () => void;
  onSpinEnd?: () => void;
  autoSpinKey?: string | null;
  primaryColor?: string;
  buttonStyle?: {
    textColor?: string;
  };
  framing?: "default" | "public" | "editor" | "mobile-preview";
};

const SVG_SIZE = 640;
const CENTER = SVG_SIZE / 2;
const OUTER_RADIUS = 278;
const INNER_RADIUS = 84;
const PRIMARY_BLUE = "#0d5aa5";
const DEEP_BLUE = "#073f78";
const PALE_BLUE = "#dceeff";

function polarToCartesian(radius: number, angleInDegrees: number) {
  const radians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: Number((CENTER + radius * Math.cos(radians)).toFixed(3)),
    y: Number((CENTER + radius * Math.sin(radians)).toFixed(3)),
  };
}

function describeSlice(startAngle: number, endAngle: number) {
  const start = polarToCartesian(OUTER_RADIUS, endAngle);
  const end = polarToCartesian(OUTER_RADIUS, startAngle);
  const innerEnd = polarToCartesian(INNER_RADIUS, endAngle);
  const innerStart = polarToCartesian(INNER_RADIUS, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    `M ${innerStart.x} ${innerStart.y}`,
    `L ${end.x} ${end.y}`,
    `A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 ${largeArcFlag} 1 ${start.x} ${start.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function GiftIcon({ color }: { color: string }) {
  return (
    <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.8">
      <rect x="-13" y="-5" width="26" height="19" rx="2" />
      <path d="M-15-5h30v7h-30z" />
      <path d="M0-5v19" />
      <path d="M0-5c-7 0-11-2-10-6 1-4 7-3 10 6Z" />
      <path d="M0-5c7 0 11-2 10-6-1-4-7-3-10 6Z" />
    </g>
  );
}

function WheelPointer() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[-1%] z-30 -translate-x-1/2">
      <svg
        viewBox="0 0 72 96"
        className="h-[4.5rem] w-[4.25rem] drop-shadow-[0_7px_7px_rgba(7,63,120,0.3)]"
        aria-hidden="true"
      >
        <path
          d="M36 92c-3.2 0-5.9-2-7.1-5L5.2 14.6C2.6 7.6 7.8 2 15.2 2h41.6c7.4 0 12.6 5.6 10 12.6L43.1 87c-1.2 3-3.9 5-7.1 5Z"
          fill="#ffffff"
        />
        <path
          d="M36 81.5 15.9 16.2c-.7-2.2.8-4 3.3-4h33.6c2.5 0 4 1.8 3.3 4L36 81.5Z"
          fill="#0b4d91"
        />
      </svg>
    </div>
  );
}

export function CocoricoWheel({
  segments,
  winningSegmentId,
  canSpin = false,
  buttonEnabled = false,
  buttonLabel = "JOUER",
  onButtonClick,
  onSpinEnd,
  autoSpinKey,
  primaryColor = PRIMARY_BLUE,
  buttonStyle,
  framing = "default",
}: CocoricoWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const visualSegments = segments.slice(0, 10);
  const segmentAngle = 360 / Math.max(visualSegments.length, 1);
  const targetIndex = Math.max(
    0,
    visualSegments.findIndex((segment) => segment.id === winningSegmentId),
  );
  const wheelSizeClass =
    framing === "public"
      ? "top-[4%] w-[min(calc(100vw-20px),380px)] sm:w-[min(calc(100vw-20px),440px)] md:w-[min(calc(100vw-24px),540px)] lg:w-[min(48vw,620px)] xl:w-[min(40vw,680px)]"
      : framing === "editor"
        ? "top-[65%] w-[104%]"
        : framing === "mobile-preview"
          ? "top-1/2 w-[104%]"
          : "top-1/2 w-full";
  const wheelTransformClass =
    framing === "public" ? "-translate-x-1/2" : "-translate-x-1/2 -translate-y-1/2";

  useEffect(() => {
    if (!isSpinning || !onSpinEnd) return;

    const timeout = window.setTimeout(() => {
      setIsSpinning(false);
      setHasSpun(true);
      onSpinEnd();
    }, 4400);

    return () => window.clearTimeout(timeout);
  }, [isSpinning, onSpinEnd]);

  const spin = useCallback(() => {
    if (isSpinning || hasSpun || !buttonEnabled || !canSpin) return;

    const centerOffset = targetIndex * segmentAngle + segmentAngle / 2;
    const jitter = (Math.random() - 0.5) * Math.min(5, segmentAngle * 0.1);
    setRotation(360 * 6 + (360 - centerOffset) + jitter);
    setIsSpinning(true);
  }, [buttonEnabled, canSpin, hasSpun, isSpinning, segmentAngle, targetIndex]);

  useEffect(() => {
    if (!autoSpinKey || !canSpin || !buttonEnabled || isSpinning || hasSpun) return;

    const timeout = window.setTimeout(spin, 0);
    return () => window.clearTimeout(timeout);
  }, [autoSpinKey, buttonEnabled, canSpin, hasSpun, isSpinning, spin]);

  function handleButton() {
    if (isSpinning || hasSpun || !buttonEnabled) return;
    if (canSpin) spin();
    else onButtonClick?.();
  }

  return (
    <div className="okado-cocorico-wheel relative h-full w-full overflow-visible" style={{ containerType: "inline-size" }}>
      <div
        className={`absolute left-1/2 aspect-square ${wheelTransformClass} ${wheelSizeClass}`}
        style={{ filter: "drop-shadow(0 25px 32px rgba(3,44,87,0.3))" }}
      >
        <div
          className="absolute inset-0 transition-transform duration-[4400ms] ease-[cubic-bezier(0.12,0.74,0.12,1)]"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <svg
            viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
            className="h-full w-full overflow-visible"
            role="img"
            aria-label="Roue de la fortune"
          >
            <title>Roue de la fortune</title>
            <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 30} fill="#ffffff" />
            <circle
              cx={CENTER}
              cy={CENTER}
              r={OUTER_RADIUS + 22}
              fill="none"
              stroke={DEEP_BLUE}
              strokeWidth="8"
            />
            {visualSegments.map((segment, index) => {
              const startAngle = index * segmentAngle + 1.4;
              const endAngle = startAngle + segmentAngle - 2.8;
              const midAngle = startAngle + (endAngle - startAngle) / 2;
              const iconPoint = polarToCartesian(207, midAngle);
              const fillColor = index % 2 === 0 ? primaryColor : "#ffffff";
              const contentColor = fillColor === "#ffffff" ? DEEP_BLUE : "#ffffff";

              return (
                <g key={segment.id}>
                  <path
                    d={describeSlice(startAngle, endAngle)}
                    fill={fillColor}
                    stroke="#ffffff"
                    strokeWidth="6"
                    strokeLinejoin="round"
                  />
                  <path
                    d={describeSlice(startAngle, endAngle)}
                    fill={index % 2 === 0 ? primaryColor : PALE_BLUE}
                    opacity="0.2"
                  />
                  <g
                    transform={`translate(${iconPoint.x} ${iconPoint.y}) rotate(${midAngle + 90})`}
                  >
                    <GiftIcon color={contentColor} />
                  </g>
                </g>
              );
            })}
            <circle cx={CENTER} cy={CENTER} r={INNER_RADIUS + 17} fill="#ffffff" />
            <circle cx={CENTER} cy={CENTER} r={INNER_RADIUS + 11} fill={DEEP_BLUE} />
            <circle cx={CENTER} cy={CENTER} r={INNER_RADIUS + 3} fill={primaryColor} />
          </svg>
        </div>

        <WheelPointer />

        <button
          type="button"
          onClick={handleButton}
          disabled={!buttonEnabled || isSpinning || hasSpun}
          aria-label={buttonLabel}
          className="okado-wheel-center-button absolute left-1/2 top-1/2 z-40 flex aspect-square w-[24%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[4px] border-white text-center font-black uppercase transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-75"
          style={{
            background: buttonEnabled && !hasSpun ? `linear-gradient(145deg, ${primaryColor}, ${DEEP_BLUE})` : "#94a3b8",
            color: buttonStyle?.textColor ?? "#ffffff",
            boxShadow: "inset 0 -8px 13px rgba(0,0,0,0.2), 0 12px 23px rgba(4,48,93,0.3)",
          }}
        >
          {isSpinning ? (
            <span className="text-[clamp(0.8rem,4cqw,1.2rem)]">...</span>
          ) : (
            <Pointer aria-hidden="true" className="h-[48%] w-[48%]" strokeWidth={2.8} />
          )}
        </button>
      </div>
    </div>
  );
}
