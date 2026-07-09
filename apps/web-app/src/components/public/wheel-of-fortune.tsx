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
  autoSpinKey?: string | null;
  buttonStyle?: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
  };
  framing?: "default" | "public" | "editor";
  pageTemplate?: "classic" | "restaurant-pop";
};

const SVG_SIZE = 640;
const CENTER = SVG_SIZE / 2;
const OUTER_RADIUS = 304;
const INNER_RADIUS = 76;
const MAX_LABEL_LINES = 3;

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

function wrapSegmentLabel(label: string) {
  const words = label.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];

  for (const word of words) {
    const current = lines[lines.length - 1] ?? "";
    const candidate = current ? `${current} ${word}` : word;

    if (!current) {
      lines.push(word);
    } else if (candidate.length <= 10) {
      lines[lines.length - 1] = candidate;
    } else if (lines.length < MAX_LABEL_LINES) {
      lines.push(word);
    } else {
      lines[lines.length - 1] = `${current.slice(0, Math.max(0, current.length - 1))}…`;
    }
  }

  return lines.length ? lines : [label];
}

function segmentTextStyles(labelLines: string[]) {
  if (labelLines.length >= 3) {
    return {
      fontSize: 17,
      lineHeight: 16,
      initialOffset: -16,
    };
  }

  if (labelLines.length === 2) {
    return {
      fontSize: 20,
      lineHeight: 18,
      initialOffset: -9,
    };
  }

  return {
    fontSize: 23,
    lineHeight: 0,
    initialOffset: 0,
  };
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
  autoSpinKey,
  buttonStyle,
  framing = "default",
  pageTemplate = "classic",
}: WheelOfFortuneProps) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);

  const isRestaurantPopTemplate = pageTemplate === "restaurant-pop";
  const baseVisualSegments = isRestaurantPopTemplate ? segments.slice(0, 10) : segments;
  const winningVisualIndex = baseVisualSegments.findIndex(
    (segment) => segment.id === winningSegmentId,
  );
  const visualSegments =
    isRestaurantPopTemplate && winningVisualIndex === -1
      ? [segments.find((segment) => segment.id === winningSegmentId) ?? baseVisualSegments[0], ...baseVisualSegments]
          .filter(Boolean)
          .slice(0, 10)
      : baseVisualSegments;
  const segmentAngle = 360 / visualSegments.length;
  const targetIndex = Math.max(
    0,
    visualSegments.findIndex((segment) => segment.id === winningSegmentId),
  );
  const colors = {
    rimColor: wheelStyle?.rimColor ?? accent.signal,
    winColor: wheelStyle?.winColor ?? accent.signal,
    alternateWinColor: wheelStyle?.alternateWinColor ?? accent.paper,
    loseColor: wheelStyle?.loseColor ?? "#edf2f7",
    alternateLoseColor: wheelStyle?.alternateLoseColor ?? "#e7edf3",
  };
  const warmNeutral = "#fff0d2";
  const wheelTop =
    framing === "public" ? undefined : framing === "editor" ? "83%" : "62%";

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

  function startSpin() {
    if (isSpinning || hasSpun || !buttonEnabled || !canSpin) {
      return;
    }

    const centerOffset = targetIndex * segmentAngle + segmentAngle / 2;
    const randomJitter = (Math.random() - 0.5) * Math.min(7, segmentAngle * 0.14);
    const finalRotation = 360 * 6 + (360 - centerOffset) + randomJitter;

    setRotation(finalRotation);
    setIsSpinning(true);
  }

  useEffect(() => {
    if (!autoSpinKey || !canSpin || !buttonEnabled) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (isSpinning || hasSpun) {
        return;
      }

      const centerOffset = targetIndex * segmentAngle + segmentAngle / 2;
      const randomJitter = (Math.random() - 0.5) * Math.min(7, segmentAngle * 0.14);
      const finalRotation = 360 * 6 + (360 - centerOffset) + randomJitter;

      setRotation(finalRotation);
      setIsSpinning(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [
    autoSpinKey,
    canSpin,
    buttonEnabled,
    hasSpun,
    isSpinning,
    segmentAngle,
    targetIndex,
  ]);

  function handleCentralButton() {
    if (isSpinning || hasSpun || !buttonEnabled) {
      return;
    }

    if (!canSpin) {
      onButtonClick?.();
      return;
    }

    startSpin();
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className={`absolute left-1/2 aspect-square -translate-x-1/2 -translate-y-1/2 ${
          framing === "public"
            ? isRestaurantPopTemplate
              ? "top-[70%] w-[142vw] max-w-none drop-shadow-[0_34px_48px_rgba(15,23,42,0.24)] sm:top-[68%] sm:w-[118vw] md:top-[66%] md:w-[98vw] lg:top-[68%] lg:w-[52vw] xl:top-[68%] xl:w-[42vw] 2xl:top-[68%] 2xl:w-[38vw]"
              : "top-[70%] w-[172vw] max-w-none sm:top-[68%] sm:w-[144vw] md:top-[66%] md:w-[122vw] lg:top-[68%] lg:w-[70vw] xl:top-[68%] xl:w-[54vw] 2xl:top-[68%] 2xl:w-[48vw]"
            : framing === "editor"
              ? isRestaurantPopTemplate
                ? "w-[150%] max-w-none drop-shadow-[0_24px_42px_rgba(15,23,42,0.18)]"
                : "w-[186%] max-w-none"
              : "w-full"
        }`}
        style={{ top: wheelTop }}
      >
        <div
          className="absolute inset-0 rounded-full transition-transform duration-[4200ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <svg
            viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
            className="h-full w-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="okado-wheel-gloss" cx="50%" cy="28%" r="68%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.82" />
                <stop offset="52%" stopColor="#ffffff" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.06" />
              </radialGradient>
              <radialGradient id="okado-wheel-depth" cx="50%" cy="38%" r="70%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="70%" stopColor="#0f172a" stopOpacity="0.02" />
                <stop offset="100%" stopColor="#020617" stopOpacity="0.14" />
              </radialGradient>
            </defs>
            {isRestaurantPopTemplate ? (
              <>
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={OUTER_RADIUS + 24}
                  fill="#fff8eb"
                  stroke="rgba(255,255,255,0.95)"
                  strokeWidth="16"
                />
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={OUTER_RADIUS + 16}
                  fill="none"
                  stroke={colors.rimColor}
                  strokeWidth="7"
                  opacity="0.95"
                />
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={OUTER_RADIUS + 2}
                  fill="none"
                  stroke="rgba(122,85,26,0.16)"
                  strokeWidth="2"
                />
              </>
            ) : (
              <circle
                cx={CENTER}
                cy={CENTER}
                r={OUTER_RADIUS + 18}
                fill="#ffffff"
                stroke={colors.rimColor}
                strokeWidth="4"
                opacity="0.98"
              />
            )}
            {visualSegments.map((segment, index) => {
              const startAngle = index * segmentAngle + 1.2;
              const endAngle = startAngle + segmentAngle - 2.4;
              const midAngle = startAngle + (endAngle - startAngle) / 2;
              const textPoint = polarToCartesian(208, midAngle);
              const labelLines = wrapSegmentLabel(segment.label);
              const textStyles = segmentTextStyles(labelLines);
              const fillColor =
                isRestaurantPopTemplate
                  ? segment.tone === "win"
                    ? colors.winColor
                    : index % 2 === 0
                      ? colors.loseColor
                      : warmNeutral
                  : segment.tone === "win"
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
                    stroke="rgba(255,255,255,0.85)"
                    strokeWidth="5"
                    strokeLinejoin="round"
                  />
                  <path
                    d={describeSlice(startAngle, endAngle)}
                    fill="url(#okado-wheel-gloss)"
                    opacity="0.42"
                  />
                  <text
                    x={textPoint.x}
                    y={textPoint.y}
                    fill={textColor}
                    fontSize={String(textStyles.fontSize)}
                    fontWeight="850"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${midAngle + 90} ${textPoint.x} ${textPoint.y})`}
                  >
                    {labelLines.map((line, lineIndex) => (
                      <tspan
                        key={`${segment.id}-${line}`}
                        x={textPoint.x}
                        dy={
                          lineIndex === 0
                            ? `${textStyles.initialOffset}px`
                            : `${textStyles.lineHeight}px`
                        }
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
            <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 4} fill="url(#okado-wheel-depth)" />
            {isRestaurantPopTemplate
              ? Array.from({ length: 18 }, (_, beadIndex) => {
                  const bead = polarToCartesian(OUTER_RADIUS + 5, beadIndex * 20);
                  return (
                    <circle
                      key={`bead-${beadIndex}`}
                      cx={bead.x}
                      cy={bead.y}
                      r="5.2"
                      fill="#fff2d7"
                      stroke={colors.rimColor}
                      strokeWidth="1"
                    />
                  );
                })
              : null}
          </svg>
        </div>

        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div
            className="absolute"
            style={{
              top: "29.5%",
              left: "50%",
              width: "10.3%",
              height: "18.9%",
              transform: "translateX(-50%)",
              clipPath: "polygon(50% 0, 88% 24%, 63% 100%, 37% 100%, 12% 24%)",
              background: isRestaurantPopTemplate
                ? `linear-gradient(180deg, ${colors.loseColor} 0%, ${colors.loseColor} 68%, #ffffff 69%, #ffffff 100%)`
                : "linear-gradient(180deg, #ffffff 0%, #f8fafc 62%, #ffffff 100%)",
              filter: "drop-shadow(0 12px 18px rgba(15,23,42,0.2))",
            }}
          />
          <div
            className="absolute rounded-b-[22px] bg-white"
            style={{
              top: "44.9%",
              left: "50%",
              width: "7.7%",
              height: "4.3%",
              transform: "translateX(-50%)",
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleCentralButton}
          disabled={!buttonEnabled || isSpinning || hasSpun}
          className={`absolute left-1/2 top-1/2 z-40 flex aspect-square ${isRestaurantPopTemplate ? "w-[18.5%]" : "w-[15.4%]"} -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[4px] text-[19px] font-black uppercase transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-75 ${isRestaurantPopTemplate ? "font-anton shadow-[0_20px_34px_rgba(15,23,42,0.24)] [text-shadow:0_3px_0_rgba(0,0,0,0.18)]" : "shadow-[0_16px_30px_rgba(15,23,42,0.16)]"}`}
          style={{
            background:
              buttonEnabled && !hasSpun
                ? `linear-gradient(180deg, ${buttonStyle?.backgroundColor ?? accent.signal}, ${buttonStyle?.backgroundColor ?? colors.rimColor})`
                : "linear-gradient(180deg, #aeb8c7, #7f8a9d)",
            color: buttonStyle?.textColor ?? "#ffffff",
            borderColor: isRestaurantPopTemplate
              ? colors.winColor
              : buttonStyle?.borderColor ?? "#ffffff",
            fontSize: isRestaurantPopTemplate
              ? "clamp(1.12rem, 2.9vw, 2.05rem)"
              : "clamp(1rem, 2.5vw, 1.75rem)",
            boxShadow: isRestaurantPopTemplate
              ? "inset 0 0 0 8px rgba(255,255,255,0.78), inset 0 -11px 18px rgba(0,0,0,0.18), 0 18px 34px rgba(15,23,42,0.24)"
              : undefined,
          }}
        >
          {isSpinning ? "..." : buttonLabel}
        </button>
      </div>
    </div>
  );
}
