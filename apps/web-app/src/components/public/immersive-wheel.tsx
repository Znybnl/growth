"use client";

import { useEffect, useId, useState } from "react";

type WheelSegment = {
  id: string;
  label: string;
  tone: "win" | "lose";
};

type ImmersiveWheelProps = {
  accent: { ink: string; paper: string; signal: string };
  wheelStyle?: {
    rimColor: string;
    winColor: string;
    alternateWinColor: string;
    loseColor: string;
    alternateLoseColor: string;
  };
  segments: WheelSegment[];
  winningSegmentId: string;
  template: "cosmic-orbit" | "sunburst-festival";
  canSpin?: boolean;
  buttonEnabled?: boolean;
  buttonLabel?: string;
  onButtonClick?: () => void;
  onSpinEnd?: () => void;
  autoSpinKey?: string | null;
  buttonStyle?: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
  };
  framing?: "default" | "public" | "editor";
};

const SVG_SIZE = 640;
const CENTER = SVG_SIZE / 2;
const OUTER_RADIUS = 274;
const INNER_RADIUS = 104;

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

function withAlpha(color: string, alpha: string) {
  const normalized = color.replace("#", "");
  return /^[0-9a-f]{6}$/i.test(normalized) ? `#${normalized}${alpha}` : color;
}

function blendWithWhite(color: string, ratio: number) {
  const normalized = color.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return "#f4f7ff";

  return `#${[0, 2, 4]
    .map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16))
    .map((channel) => Math.round(channel + (255 - channel) * ratio))
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function readableTextColor(fill: string, fallback = "#ffffff") {
  const normalized = fill.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return fallback;
  const channels = [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
  const luminance = (0.299 * channels[0] + 0.587 * channels[1] + 0.114 * channels[2]) / 255;
  return luminance > 0.67 ? "#10213f" : "#ffffff";
}

function labelLines(label: string) {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [label];

  const first = words[0];
  const rest = words.slice(1).join(" ");
  return rest.length > 11 ? [first, rest.slice(0, 10) + "..."] : [first, rest];
}

export function ImmersiveWheel({
  accent,
  wheelStyle,
  segments,
  winningSegmentId,
  template,
  canSpin = false,
  buttonEnabled = false,
  buttonLabel = "JOUER",
  onButtonClick,
  onSpinEnd,
  autoSpinKey,
  buttonStyle,
  framing = "default",
}: ImmersiveWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const filterId = useId().replace(/:/g, "");
  const isCosmic = template === "cosmic-orbit";
  const visualSegments = segments.slice(0, 10);
  const segmentAngle = 360 / Math.max(visualSegments.length, 1);
  const targetIndex = Math.max(0, visualSegments.findIndex((segment) => segment.id === winningSegmentId));
  const primary = wheelStyle?.loseColor ?? accent.signal;
  const secondary = wheelStyle?.winColor ?? accent.paper;
  const palePrimary = blendWithWhite(primary, isCosmic ? 0.16 : 0.72);
  const paleSecondary = blendWithWhite(secondary, isCosmic ? 0.2 : 0.75);
  const wheelSizeClass =
    framing === "public"
      ? "top-[67%] w-[132vw] sm:top-[65%] sm:w-[104vw] lg:top-[65%] lg:w-[48vw] xl:w-[40vw]"
      : framing === "editor"
        ? "top-[65%] w-[112%]"
        : "top-1/2 w-full";

  useEffect(() => {
    if (!isSpinning || !onSpinEnd) return;
    const timeout = window.setTimeout(() => {
      setIsSpinning(false);
      setHasSpun(true);
      onSpinEnd();
    }, 4400);
    return () => window.clearTimeout(timeout);
  }, [isSpinning, onSpinEnd]);

  function spin() {
    if (isSpinning || hasSpun || !buttonEnabled || !canSpin) return;
    const centerOffset = targetIndex * segmentAngle + segmentAngle / 2;
    const jitter = (Math.random() - 0.5) * Math.min(6, segmentAngle * 0.13);
    setRotation(360 * 6 + (360 - centerOffset) + jitter);
    setIsSpinning(true);
  }

  useEffect(() => {
    if (!autoSpinKey || !canSpin || !buttonEnabled || isSpinning || hasSpun) return;
    const timeout = window.setTimeout(() => {
      const centerOffset = targetIndex * segmentAngle + segmentAngle / 2;
      const jitter = (Math.random() - 0.5) * Math.min(6, segmentAngle * 0.13);
      setRotation(360 * 6 + (360 - centerOffset) + jitter);
      setIsSpinning(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [autoSpinKey, buttonEnabled, canSpin, hasSpun, isSpinning, segmentAngle, targetIndex]);

  function handleButton() {
    if (isSpinning || hasSpun || !buttonEnabled) return;
    if (canSpin) spin();
    else onButtonClick?.();
  }

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ containerType: "inline-size" }}>
      <div
        className={`absolute left-1/2 aspect-square -translate-x-1/2 -translate-y-1/2 ${wheelSizeClass}`}
        style={{ filter: isCosmic ? "drop-shadow(0 28px 45px rgba(0,0,0,0.38))" : "drop-shadow(0 22px 34px rgba(20,31,61,0.22))" }}
      >
        <div
          className="absolute inset-0 transition-transform duration-[4400ms] ease-[cubic-bezier(0.12,0.74,0.12,1)]"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <svg viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} className="h-full w-full overflow-visible" aria-hidden="true">
            <defs>
              <filter id={`glow-${filterId}`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <radialGradient id={`center-${filterId}`} cx="36%" cy="28%" r="78%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.44" />
                <stop offset="100%" stopColor="#020617" stopOpacity={isCosmic ? "0.34" : "0.08"} />
              </radialGradient>
            </defs>
            {isCosmic ? (
              <>
                <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 25} fill="none" stroke={withAlpha(secondary, "4d")} strokeWidth="3" strokeDasharray="4 11" />
                <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 13} fill="#07142e" stroke={withAlpha(secondary, "d9")} strokeWidth="4" />
                <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 5} fill="none" stroke={withAlpha(primary, "cc")} strokeWidth="10" filter={`url(#glow-${filterId})`} />
              </>
            ) : (
              <>
                <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 24} fill="#fffdf7" stroke={withAlpha(primary, "d9")} strokeWidth="5" />
                <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 12} fill="none" stroke={withAlpha(secondary, "99")} strokeWidth="11" strokeDasharray="2 18" strokeLinecap="round" />
              </>
            )}
            {visualSegments.map((segment, index) => {
              const startAngle = index * segmentAngle + 1.6;
              const endAngle = startAngle + segmentAngle - 3.2;
              const midAngle = startAngle + (endAngle - startAngle) / 2;
              const point = polarToCartesian(196, midAngle);
              const fill = isCosmic
                ? index % 2 === 0 ? primary : secondary
                : index % 2 === 0 ? palePrimary : paleSecondary;
              const textColor = readableTextColor(fill, isCosmic ? "#ffffff" : "#10213f");
              const lines = labelLines(segment.label);

              return (
                <g key={segment.id}>
                  <path d={describeSlice(startAngle, endAngle)} fill={fill} stroke={isCosmic ? "#0b1833" : "#fffdf7"} strokeWidth={isCosmic ? "5" : "6"} />
                  <path d={describeSlice(startAngle, endAngle)} fill={`url(#center-${filterId})`} opacity={isCosmic ? "0.6" : "0.25"} />
                  <text
                    x={point.x}
                    y={point.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={textColor}
                    fontSize="20"
                    fontWeight="800"
                    letterSpacing="0.5"
                    transform={`rotate(${midAngle + 90} ${point.x} ${point.y})`}
                  >
                    {lines.map((line, lineIndex) => (
                      <tspan key={`${segment.id}-${lineIndex}`} x={point.x} dy={lineIndex === 0 ? `${lines.length > 1 ? -9 : 0}px` : "18px"}>{line}</tspan>
                    ))}
                  </text>
                </g>
              );
            })}
            <circle cx={CENTER} cy={CENTER} r={INNER_RADIUS + 13} fill={isCosmic ? "#07142e" : "#fffdf7"} stroke={isCosmic ? withAlpha(secondary, "cc") : withAlpha(primary, "80")} strokeWidth="5" />
            {isCosmic ? Array.from({ length: visualSegments.length }, (_, index) => {
              const node = polarToCartesian(OUTER_RADIUS + 15, index * segmentAngle + segmentAngle / 2);
              return <circle key={`node-${index}`} cx={node.x} cy={node.y} r="4" fill={secondary} filter={`url(#glow-${filterId})`} />;
            }) : null}
          </svg>
        </div>

        <div className="pointer-events-none absolute left-1/2 top-[4.6%] z-30 -translate-x-1/2">
          <div
            className={isCosmic ? "h-14 w-12" : "h-16 w-14"}
            style={{
              clipPath: "polygon(50% 100%, 3% 5%, 97% 5%)",
              background: isCosmic ? `linear-gradient(180deg, ${secondary}, ${primary})` : primary,
              filter: "drop-shadow(0 5px 5px rgba(15,23,42,0.22))",
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleButton}
          disabled={!buttonEnabled || isSpinning || hasSpun}
          className={`absolute left-1/2 top-1/2 z-40 flex aspect-square w-[23%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[5px] text-center font-black tracking-[0.04em] transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-75 ${isCosmic ? "font-display" : "font-fredoka"}`}
          style={{
            background: buttonEnabled && !hasSpun ? `linear-gradient(145deg, ${primary}, ${withAlpha(primary, "cc")})` : "#94a3b8",
            color: buttonStyle?.textColor ?? "#ffffff",
            borderColor: isCosmic ? secondary : "#fffdf7",
            fontSize: isCosmic ? "clamp(0.72rem, 4.2cqw, 1.22rem)" : "clamp(0.78rem, 4.5cqw, 1.32rem)",
            boxShadow: isCosmic
              ? `inset 0 0 0 4px ${withAlpha(secondary, "70")}, inset 0 -12px 18px rgba(0,0,0,0.26), 0 15px 28px rgba(0,0,0,0.35)`
              : `inset 0 -10px 15px rgba(0,0,0,0.14), 0 14px 24px ${withAlpha(primary, "40")}`,
          }}
        >
          {isSpinning ? "..." : buttonLabel}
        </button>
      </div>
    </div>
  );
}

