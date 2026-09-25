"use client";

import { useEffect, useState } from "react";
import { Pointer } from "lucide-react";
import { RoseFlowerMark } from "@/components/public/rose-powder-decor";
import { beautyWheelLegibleText, beautyWheelTheme, isBeautyWheelTemplate, type BeautyWheelTemplateId } from "@/lib/beauty-wheel-themes";
import { rosePowderVisualSegments } from "@/lib/wheel-segments";

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
  framing?: "default" | "public" | "editor" | "mobile-preview";
  pageTemplate?: "classic" | "restaurant-pop" | "rose-institut" | BeautyWheelTemplateId;
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

function describeSlice(startAngle: number, endAngle: number, innerRadius = INNER_RADIUS) {
  const start = polarToCartesian(OUTER_RADIUS, endAngle);
  const end = polarToCartesian(OUTER_RADIUS, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  const innerEnd = polarToCartesian(innerRadius, endAngle);
  const innerStart = polarToCartesian(innerRadius, startAngle);

  return [
    `M ${innerStart.x} ${innerStart.y}`,
    `L ${end.x} ${end.y}`,
    `A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 ${largeArcFlag} 1 ${start.x} ${start.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
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

function deriveLighterHex(hex: string, ratio = 0.76) {
  const normalized = hex.replace("#", "");

  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    return "#edf2f7";
  }

  const channels = [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
  const lightened = channels
    .map((channel) => Math.round(channel + (255 - channel) * ratio))
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("");

  return `#${lightened}`;
}

function deriveDarkerHex(hex: string, ratio = 0.18) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return "#b95f75";
  return `#${[0, 2, 4]
    .map((offset) => Math.round(Number.parseInt(normalized.slice(offset, offset + 2), 16) * (1 - ratio)))
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");

  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    return `rgba(243, 164, 196, ${alpha})`;
  }

  const channels = [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
  return `rgba(${channels.join(", ")}, ${alpha})`;
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

function segmentTextStyles(labelLines: string[], isRoseInstitutTemplate = false) {
  if (isRoseInstitutTemplate) {
    if (labelLines.length >= 3) {
      return {
        fontSize: 22,
        lineHeight: 19,
        initialOffset: -19,
      };
    }

    if (labelLines.length === 2) {
      return {
        fontSize: 26,
        lineHeight: 23,
        initialOffset: -11.5,
      };
    }

    return {
      fontSize: 29,
      lineHeight: 0,
      initialOffset: 0,
    };
  }

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
  const isRoseInstitutTemplate = pageTemplate === "rose-institut";
  const isBeautyTemplate = isBeautyWheelTemplate(pageTemplate);
  const isRosePowderTemplate = pageTemplate === "beauty-rose";
  const beautyTheme = beautyWheelTheme(pageTemplate);
  const baseVisualSegments = isRosePowderTemplate
    ? rosePowderVisualSegments(segments, winningSegmentId)
    : isRoseInstitutTemplate
    ? segments.slice(0, 8)
    : isRestaurantPopTemplate
      ? segments.slice(0, 10)
      : segments;
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
  const roseGlow = {
    near: withAlpha(colors.loseColor, 0.2),
    far: withAlpha(colors.loseColor, 0.1),
  };
  const classicLightColor = deriveLighterHex(colors.loseColor);
  const roseAccent = colors.loseColor.toLowerCase() === "#d58a9a" ? "#b95f75" : deriveDarkerHex(colors.loseColor);
  const isDefaultRoseColor = colors.loseColor.toLowerCase() === "#d58a9a";
  const roseIvory = colors.alternateLoseColor.toLowerCase() === "#fff7f8" ? "#fffdfc" : colors.alternateLoseColor;
  const roseLight = isDefaultRoseColor ? "#f3cdd5" : deriveLighterHex(colors.loseColor, 0.67);
  const roseMedium = isDefaultRoseColor ? "#e7aebb" : deriveLighterHex(colors.loseColor, 0.4);
  const wheelTop =
    framing === "public" ? undefined : isRosePowderTemplate ? (framing === "mobile-preview" ? "calc(35% - 10px)" : "calc(40% - 10px)") : isBeautyTemplate ? (framing === "mobile-preview" ? "35%" : "40%") : framing === "editor" ? "83%" : framing === "mobile-preview" ? "70%" : "62%";
  const wheelFrameSizeClass =
    framing === "public"
      ? isBeautyTemplate
        ? `${isRosePowderTemplate ? "top-[-6px]" : "top-1"} w-[min(calc(100vw-28px),calc(100dvh-315px),480px)] sm:w-[min(calc(100vw-36px),calc(100dvh-315px),560px)] md:w-[min(52vw,calc(100dvh-260px),640px)]`
      : isRoseInstitutTemplate
        ? "top-1 w-[min(calc(100vw-32px),calc(100dvh-320px),430px)] sm:w-[min(calc(100vw-36px),calc(100dvh-320px),520px)] md:w-[min(52vw,640px)] lg:w-[min(48vw,680px)]"
        : "top-2 w-[max(130vw,calc(100svh-240px))] max-w-none sm:w-[min(118vw,calc(100svh-220px))] md:w-[min(98vw,calc(100svh-220px))] lg:w-[min(52vw,calc(100svh-220px))] xl:w-[min(42vw,calc(100svh-220px))] 2xl:w-[min(38vw,calc(100svh-220px))]"
      : framing === "editor"
        ? isBeautyTemplate ? "w-[86%] max-w-none" : isRoseInstitutTemplate ? "w-[122%] max-w-none" : "w-[150%] max-w-none"
        : framing === "mobile-preview"
          ? isBeautyTemplate ? "w-[86%] max-w-none" : isRoseInstitutTemplate ? "w-[122%] max-w-none" : "w-[150%] max-w-none"
          : "w-full";
  const wheelTransformClass =
    framing === "public" ? "-translate-x-1/2" : "-translate-x-1/2 -translate-y-1/2";

  useEffect(() => {
    if (!isSpinning || !onSpinEnd) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(() => {
      setIsSpinning(false);
      setHasSpun(true);
      onSpinEnd();
    }, reducedMotion ? 150 : 4400);

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
    <div className="relative h-full w-full overflow-visible" style={{ containerType: "inline-size" }}>
      <div
        className={`absolute left-1/2 aspect-square ${wheelTransformClass} ${wheelFrameSizeClass} ${
          isRosePowderTemplate
            ? "drop-shadow-[0_12px_30px_rgba(90,45,60,0.12)]"
          : isBeautyTemplate
            ? ""
          : isRestaurantPopTemplate
            ? "drop-shadow-[0_28px_42px_rgba(15,23,42,0.24)]"
            : isRoseInstitutTemplate
              ? ""
            : "drop-shadow-[0_20px_34px_rgba(15,23,42,0.16)]"
        }`}
        style={{ top: wheelTop }}
      >
        {(isRoseInstitutTemplate || isBeautyTemplate) && !isRosePowderTemplate ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-[10%] z-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${roseGlow.near} 0%, ${roseGlow.near} 54%, ${roseGlow.far} 68%, transparent 84%)`,
              filter: isBeautyTemplate ? "blur(18px)" : "blur(14px)",
              transform: "scale(1.04)",
            }}
          />
        ) : null}
        <div
          className={`absolute inset-0 rounded-full transition-transform duration-[4200ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isRoseInstitutTemplate ? "drop-shadow-[0_14px_24px_rgba(11,78,162,0.11)]" : ""
          }`}
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <svg
            viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
            className="h-full w-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
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
                  r={OUTER_RADIUS + 9}
                  fill="#fff8eb"
                  stroke="#fffdf7"
                  strokeWidth="13"
                />
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={OUTER_RADIUS - 5}
                  fill="none"
                  stroke="rgba(111,78,37,0.18)"
                  strokeWidth="1.5"
                />
              </>
            ) : isRosePowderTemplate ? (
              <>
                <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 12} fill="#fffdfc" stroke={isDefaultRoseColor ? "#e7aebb" : deriveLighterHex(colors.rimColor, 0.32)} strokeWidth="2" />
                <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 7} fill="none" stroke={isDefaultRoseColor ? "#f3cdd5" : deriveLighterHex(colors.rimColor, 0.68)} strokeWidth="1" />
                <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 2} fill="none" stroke="#fffdfc" strokeWidth="2" />
              </>
            ) : isBeautyTemplate ? (
              <>
                <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 13} fill={beautyTheme?.secondary ?? "#fff"} stroke={colors.rimColor} strokeWidth={pageTemplate === "beauty-pop" ? 8 : pageTemplate === "beauty-tech" ? 6 : 3} />
                <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 3} fill="none" stroke="rgba(255,255,255,.78)" strokeWidth="3" />
              </>
            ) : isRoseInstitutTemplate ? (
              <>
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={OUTER_RADIUS + 18}
                  fill="#ffffff"
                  stroke="#ffffff"
                  strokeWidth="18"
                />
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={OUTER_RADIUS + 8}
                  fill="none"
                  stroke="rgba(11,78,162,0.12)"
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
              const startAngle = index * segmentAngle + (isRosePowderTemplate ? 0 : 1.2);
              const endAngle = startAngle + segmentAngle - (isRosePowderTemplate ? 0 : 2.4);
              const midAngle = startAngle + (endAngle - startAngle) / 2;
              const textPoint = polarToCartesian(isRosePowderTemplate ? 211 : 208, midAngle);
              const radialTextAngle = midAngle + 90;
              const uprightTextAngle = radialTextAngle % 360 > 90 && radialTextAngle % 360 < 270
                ? radialTextAngle + 180
                : radialTextAngle;
              const labelLines = wrapSegmentLabel(segment.label);
              const textStyles = segmentTextStyles(labelLines, isRoseInstitutTemplate);
              if (isBeautyTemplate) {
                const manySegments = visualSegments.length >= 8;
                textStyles.fontSize = isRosePowderTemplate
                  ? manySegments ? 24 : visualSegments.length >= 6 ? 27 : 30
                  : manySegments ? 20 : visualSegments.length >= 6 ? 24 : 28;
                if (labelLines.length >= 3) textStyles.fontSize -= isRosePowderTemplate ? 1 : 2;
                if (isRosePowderTemplate) {
                  textStyles.lineHeight = textStyles.fontSize * 0.94;
                  textStyles.initialOffset = -((labelLines.length - 1) * textStyles.lineHeight) / 2;
                }
              }
              // Colors are an aesthetic rhythm, independent from the winning outcome.
              const fillColor = isRosePowderTemplate
                ? index % 3 === 0 ? roseIvory : index % 3 === 1 ? roseLight : roseMedium
                : isBeautyTemplate
                ? pageTemplate === "beauty-pop" && index % 4 === 2
                  ? deriveLighterHex(colors.loseColor, 0.26)
                  : pageTemplate === "beauty-pop" && index % 4 === 3
                    ? colors.alternateLoseColor
                    : index % 2 === 0 ? colors.loseColor : colors.alternateLoseColor
                : isRestaurantPopTemplate
                ? index % 2 === 0
                  ? colors.loseColor
                  : colors.winColor
                : isRoseInstitutTemplate
                  ? index % 2 === 0
                    ? colors.loseColor
                    : colors.alternateLoseColor
                : index % 2 === 0
                  ? colors.loseColor
                  : classicLightColor;
              const textColor = isBeautyTemplate
                ? beautyWheelLegibleText(fillColor, beautyTheme?.text)
                : isRoseInstitutTemplate
                ? buttonStyle?.backgroundColor ?? "#0b4ea2"
                : readableTextColor(fillColor, segment.tone === "win" ? accent.ink : "#111827");

              return (
                <g key={segment.id}>
                  <path
                    d={describeSlice(startAngle, endAngle, isRosePowderTemplate ? 62 : INNER_RADIUS)}
                    fill={fillColor}
                    stroke={isRosePowderTemplate ? "rgba(185,95,117,.29)" : "rgba(255,255,255,0.9)"}
                    strokeWidth={isRosePowderTemplate ? "1.1" : isBeautyTemplate ? pageTemplate === "beauty-pop" ? "4" : "3" : isRoseInstitutTemplate ? "7" : "5"}
                    strokeLinejoin="round"
                  />
                  <text
                    x={textPoint.x}
                    y={textPoint.y}
                    fill={textColor}
                    fontFamily={isBeautyTemplate ? "var(--font-dm-sans), sans-serif" : "Roboto, sans-serif"}
                    fontSize={String(textStyles.fontSize)}
                    fontWeight={isRosePowderTemplate ? "600" : "850"}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={isRosePowderTemplate ? undefined : `rotate(${isBeautyTemplate ? uprightTextAngle : radialTextAngle} ${textPoint.x} ${textPoint.y})`}
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
            {!isRoseInstitutTemplate && !isBeautyTemplate ? <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 4} fill="url(#okado-wheel-depth)" /> : null}
            {isRestaurantPopTemplate
              ? Array.from({ length: visualSegments.length }, (_, beadIndex) => {
                  const bead = polarToCartesian(
                    OUTER_RADIUS + 9,
                    beadIndex * segmentAngle + segmentAngle / 2,
                  );
                  return (
                    <circle
                      key={`bead-${beadIndex}`}
                      cx={bead.x}
                      cy={bead.y}
                      r="3.5"
                      fill="#fffdf7"
                      stroke="rgba(111,78,37,0.38)"
                      strokeWidth="1.2"
                    />
                  );
                })
              : null}
          </svg>
        </div>

        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          {isRosePowderTemplate ? (
            <svg
              aria-hidden="true"
              className="absolute left-1/2 top-[-1%] h-[16%] w-[10%] -translate-x-1/2 overflow-visible"
              viewBox="0 0 48 64"
              style={{ filter: "drop-shadow(0 3px 5px rgba(74,47,54,.13))" }}
            >
              <path d="M24 2C35 2 43 10 43 22C43 36 31 50 24 62C17 50 5 36 5 22C5 10 13 2 24 2Z" fill={roseAccent} stroke="#fffdfc" strokeWidth="2" strokeLinejoin="round" />
              <path d="M15 15C18 11 22 10 27 11" fill="none" stroke="#fffdfc" strokeOpacity="0.58" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          ) : <div
            className="absolute"
            style={{
              top: isRoseInstitutTemplate || isBeautyTemplate ? "-1.2%" : "31.2%",
              left: "50%",
              width: isRestaurantPopTemplate ? "12.4%" : isRoseInstitutTemplate ? "13.2%" : isBeautyTemplate ? "11.4%" : "10.3%",
              height: isRestaurantPopTemplate ? "20.4%" : isRoseInstitutTemplate ? "18.5%" : isBeautyTemplate ? "16%" : "18.9%",
              transform: "translateX(-50%)",
              clipPath: "polygon(50% 0, 84% 14%, 72% 76%, 50% 100%, 28% 76%, 16% 14%)",
              background: isBeautyTemplate ? colors.rimColor : isRestaurantPopTemplate
                ? "#fffdf7"
                : isRoseInstitutTemplate
                  ? "#ffffff"
                : "linear-gradient(180deg, #ffffff 0%, #f8fafc 62%, #ffffff 100%)",
              filter: isBeautyTemplate ? "drop-shadow(0 5px 6px rgba(0,0,0,.16))" : isRoseInstitutTemplate
                ? "drop-shadow(0 6px 10px rgba(11,78,162,0.18))"
                : "drop-shadow(0 12px 18px rgba(15,23,42,0.2))",
            }}
          >
            {isRestaurantPopTemplate || isRoseInstitutTemplate || isBeautyTemplate ? (
              <div
                className="absolute inset-[9%]"
                style={{
                  clipPath: "polygon(50% 0, 82% 18%, 67% 73%, 50% 94%, 33% 73%, 18% 18%)",
                  background: isBeautyTemplate ? colors.rimColor : isRoseInstitutTemplate
                    ? colors.loseColor
                    : `linear-gradient(180deg, ${colors.rimColor}, ${colors.winColor})`,
                }}
              />
            ) : null}
          </div>}
          {!isRestaurantPopTemplate && !isRoseInstitutTemplate && !isBeautyTemplate ? (
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
          ) : null}
        </div>

        <button
          type="button"
          aria-label={isBeautyTemplate ? (isSpinning ? "La roue tourne" : "Jouer à la roue") : undefined}
          onClick={handleCentralButton}
          disabled={!buttonEnabled || isSpinning || hasSpun}
          className={`okado-wheel-center-button absolute left-1/2 top-1/2 z-40 flex aspect-square ${isRestaurantPopTemplate ? "w-[21%]" : isRoseInstitutTemplate ? "w-[28%]" : isRosePowderTemplate ? "w-[29%]" : isBeautyTemplate ? "w-[23%]" : "w-[19.2%]"} -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full ${isRestaurantPopTemplate || pageTemplate === "classic" ? "border-0" : isRosePowderTemplate ? "border-[2px]" : isRoseInstitutTemplate || isBeautyTemplate ? "border-[3px]" : "border-[4px]"} text-[19px] font-black uppercase transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-75 ${isRestaurantPopTemplate || isRosePowderTemplate ? "" : "shadow-[0_16px_30px_rgba(15,23,42,0.16)]"}`}
          style={{
            background: isRosePowderTemplate ? "#fffdfc" :
              buttonEnabled && !hasSpun
                ? isRoseInstitutTemplate || isBeautyTemplate
                  ? buttonStyle?.backgroundColor ?? accent.signal
                  : `linear-gradient(180deg, ${buttonStyle?.backgroundColor ?? accent.signal}, ${buttonStyle?.backgroundColor ?? colors.rimColor})`
                : "linear-gradient(180deg, #aeb8c7, #7f8a9d)",
            color: isRosePowderTemplate ? (buttonStyle?.backgroundColor?.toLowerCase() === colors.loseColor.toLowerCase() ? roseAccent : buttonStyle?.backgroundColor ?? roseAccent) : isBeautyTemplate ? beautyWheelLegibleText(buttonStyle?.backgroundColor ?? colors.loseColor, buttonStyle?.textColor) : buttonStyle?.textColor ?? "#ffffff",
            borderColor: isRosePowderTemplate ? deriveLighterHex(colors.rimColor, 0.35) : isRestaurantPopTemplate ? "transparent" : isRoseInstitutTemplate || isBeautyTemplate ? "#ffffff" : buttonStyle?.borderColor ?? "#ffffff",
            fontSize: isRestaurantPopTemplate
              ? "clamp(0.88rem, 5.1cqw, 1.75rem)"
              : isRoseInstitutTemplate
                ? "clamp(0.92rem, 5.6cqw, 1.8rem)"
              : "clamp(0.84rem, 4.7cqw, 1.55rem)",
            boxShadow: isRosePowderTemplate ? "0 4px 12px rgba(90,45,60,.12), 0 0 0 3px rgba(255,253,252,.88)" : isRestaurantPopTemplate ? "none" : isBeautyTemplate ? `0 8px 20px ${withAlpha(colors.loseColor, 0.24)}` : isRoseInstitutTemplate ? "0 8px 18px rgba(11,78,162,0.22)" : undefined,
          }}
        >
          {isRosePowderTemplate ? <span className="flex flex-col items-center gap-0.5"><RoseFlowerMark className="h-[clamp(19px,6cqw,27px)] w-[clamp(19px,6cqw,27px)]" /><span className="text-[clamp(13px,4cqw,18px)] font-bold tracking-[0.045em]">{isSpinning ? "..." : buttonLabel}</span></span> : isBeautyTemplate ? <span className="flex flex-col items-center gap-0.5"><Pointer aria-hidden="true" className="h-[clamp(20px,7cqw,34px)] w-[clamp(20px,7cqw,34px)]" strokeWidth={2.2} /><span className="text-[clamp(8px,2.6cqw,12px)] tracking-[0.12em]">{isSpinning ? "..." : buttonLabel}</span></span> : isSpinning ? "..." : buttonLabel}
        </button>
      </div>
    </div>
  );
}
