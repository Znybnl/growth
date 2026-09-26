"use client";

import { useEffect, useState } from "react";
import { Pointer } from "lucide-react";
import { RoseFlowerMark } from "@/components/public/rose-powder-decor";
import { textFontFamily } from "@/lib/format";
import { beautyWheelButtonTextColor, beautyWheelLegibleText, beautyWheelTheme, isBeautyWheelTemplate, type BeautyWheelTemplateId } from "@/lib/beauty-wheel-themes";
import { rosePowderVisualSegments } from "@/lib/wheel-segments";
import { buildBeautyWheelSegmentColors, limitBeautyWheelSegments } from "@/lib/beauty-wheel-segments";

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

const BEAUTY_PUBLIC_WHEEL_FRAME_CLASSES: Record<BeautyWheelTemplateId, string> = {
  "beauty-rose": "top-[18px] w-[min(82vw,calc(100dvh-315px),360px)] sm:w-[min(82vw,calc(100dvh-315px),380px)] md:w-[min(46vw,calc(100dvh-260px),390px)] lg:w-[min(39vw,calc(100dvh-260px),390px)]",
  "beauty-nude": "top-1 w-[min(76vw,calc(100dvh-315px),360px)] sm:w-[min(76vw,calc(100dvh-315px),380px)] md:w-[min(46vw,calc(100dvh-260px),390px)] lg:w-[min(39vw,calc(100dvh-260px),390px)]",
  "beauty-botanical": "top-1 w-[min(78vw,calc(100dvh-315px),360px)] sm:w-[min(78vw,calc(100dvh-315px),380px)] md:w-[min(46vw,calc(100dvh-260px),390px)] lg:w-[min(39vw,calc(100dvh-260px),390px)]",
  "beauty-pop": "top-1 w-[min(86vw,calc(100dvh-315px),380px)] sm:w-[min(86vw,calc(100dvh-315px),380px)] md:w-[min(46vw,calc(100dvh-260px),390px)] lg:w-[min(39vw,calc(100dvh-260px),390px)]",
  "beauty-editorial": "top-1 w-[min(82vw,calc(100dvh-315px),360px)] sm:w-[min(82vw,calc(100dvh-315px),380px)] md:w-[min(46vw,calc(100dvh-260px),390px)] lg:w-[min(39vw,calc(100dvh-260px),390px)]",
  "beauty-tech": "top-1 w-[min(82vw,calc(100dvh-315px),360px)] sm:w-[min(82vw,calc(100dvh-315px),380px)] md:w-[min(46vw,calc(100dvh-260px),390px)] lg:w-[min(39vw,calc(100dvh-260px),390px)]",
};

const BEAUTY_PREVIEW_WHEEL_FRAME_CLASSES: Record<BeautyWheelTemplateId, string> = {
  "beauty-rose": "w-[90%] max-w-none",
  "beauty-nude": "w-[76%] max-w-none",
  "beauty-botanical": "w-[78%] max-w-none",
  "beauty-pop": "w-[86%] max-w-none",
  "beauty-editorial": "w-[82%] max-w-none",
  "beauty-tech": "w-[82%] max-w-none",
};

const BEAUTY_POINTER_SHAPES: Record<BeautyWheelTemplateId, string> = {
  "beauty-rose": "polygon(50% 0, 84% 14%, 72% 76%, 50% 100%, 28% 76%, 16% 14%)",
  "beauty-nude": "polygon(50% 0, 94% 48%, 50% 100%, 6% 48%)",
  "beauty-botanical": "polygon(50% 0, 88% 34%, 74% 76%, 50% 100%, 26% 76%, 12% 34%)",
  "beauty-pop": "polygon(50% 0, 95% 32%, 83% 76%, 50% 100%, 17% 76%, 5% 32%)",
  "beauty-editorial": "polygon(50% 0, 90% 50%, 50% 100%, 10% 50%)",
  "beauty-tech": "polygon(50% 0, 91% 44%, 50% 100%, 9% 44%)",
};

const BEAUTY_POINTER_INNER_COLORS: Record<BeautyWheelTemplateId, string> = {
  "beauty-rose": "#fffdfc",
  "beauty-nude": "#fffdf8",
  "beauty-botanical": "#fcfbf6",
  "beauty-pop": "#fff8f8",
  "beauty-editorial": "#fcfaf5",
  "beauty-tech": "#d9ccff",
};

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
  const beautyTemplateId = isBeautyWheelTemplate(pageTemplate) ? pageTemplate : undefined;
  const beautyTheme = beautyWheelTheme(pageTemplate);
  const baseVisualSegments = isRosePowderTemplate
    ? rosePowderVisualSegments(segments, winningSegmentId)
    : isBeautyTemplate
      ? limitBeautyWheelSegments(segments, winningSegmentId)
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
  const beautySegmentColors = isBeautyTemplate
    ? buildBeautyWheelSegmentColors(
        beautyTemplateId!,
        visualSegments.length,
        colors.loseColor,
        colors.alternateLoseColor,
      )
    : [];
  const roseGlow = {
    near: withAlpha(colors.loseColor, 0.2),
    far: withAlpha(colors.loseColor, 0.1),
  };
  const beautyRimWidth = pageTemplate === "beauty-pop" ? 2.2 : pageTemplate === "beauty-nude" ? 1.5 : 2;
  const beautyOuterRingColor = pageTemplate === "beauty-editorial" ? "#b99a68" : colors.rimColor;
  const beautyRingHighlight = pageTemplate === "beauty-tech" ? "rgba(233,224,255,.78)" : "rgba(255,255,255,.9)";
  const beautyInnerRingColor = pageTemplate === "beauty-editorial" ? "#c5a875" : withAlpha(colors.rimColor, 0.34);
  const beautyWheelShadow = pageTemplate === "beauty-tech"
    ? "drop-shadow(0 10px 22px rgba(124,77,255,.12))"
    : pageTemplate === "beauty-botanical"
      ? "drop-shadow(0 10px 20px rgba(54,84,61,.12))"
      : pageTemplate === "beauty-nude" || pageTemplate === "beauty-editorial"
        ? "drop-shadow(0 10px 20px rgba(88,68,43,.12))"
        : "drop-shadow(0 12px 24px rgba(102,44,65,.14))";
  const beautySeparatorColor = pageTemplate === "beauty-rose"
    ? "rgba(232,184,194,.92)"
    : pageTemplate === "beauty-nude"
      ? "rgba(185,144,82,.42)"
      : pageTemplate === "beauty-botanical"
        ? "rgba(255,255,255,.95)"
        : pageTemplate === "beauty-pop"
          ? "rgba(255,255,255,.94)"
          : pageTemplate === "beauty-editorial"
            ? "rgba(196,168,121,.55)"
            : "rgba(232,221,255,.62)";
  const beautySeparatorWidth = pageTemplate === "beauty-pop" ? 1.8 : pageTemplate === "beauty-botanical" ? 1.6 : 1.25;
  const centerButtonBackground = buttonStyle?.backgroundColor ?? accent.signal;
  const classicLightColor = deriveLighterHex(colors.loseColor);
  const roseAccent = colors.loseColor.toLowerCase() === "#d58a9a" ? "#b95f75" : deriveDarkerHex(colors.loseColor);
  const isDefaultRoseColor = colors.loseColor.toLowerCase() === "#d58a9a";
  const roseIvory = colors.alternateLoseColor.toLowerCase() === "#fff7f8" ? "#fffdfc" : colors.alternateLoseColor;
  const roseLight = isDefaultRoseColor ? "#f3cdd5" : deriveLighterHex(colors.loseColor, 0.67);
  const roseMedium = isDefaultRoseColor ? "#e7aebb" : deriveLighterHex(colors.loseColor, 0.4);
  const wheelTop =
    framing === "public" ? undefined : isRosePowderTemplate ? (framing === "mobile-preview" ? "calc(35% + 14px)" : "calc(40% + 14px)") : isBeautyTemplate ? (framing === "mobile-preview" ? "35%" : "40%") : isRoseInstitutTemplate ? "50%" : framing === "editor" ? "83%" : framing === "mobile-preview" ? "70%" : "62%";
  const wheelFrameSizeClass =
    framing === "public"
      ? isBeautyTemplate
        ? BEAUTY_PUBLIC_WHEEL_FRAME_CLASSES[beautyTemplateId!]
      : isRoseInstitutTemplate
        ? "top-1 w-[min(calc(100vw-32px),calc(100dvh-320px),430px)] sm:w-[min(calc(100vw-36px),calc(100dvh-320px),520px)] md:w-[min(52vw,640px)] lg:w-[min(48vw,680px)]"
        : "top-2 w-[max(130vw,calc(100svh-240px))] max-w-none sm:w-[min(118vw,calc(100svh-220px))] md:w-[min(98vw,calc(100svh-220px))] lg:w-[min(52vw,calc(100svh-220px))] xl:w-[min(42vw,calc(100svh-220px))] 2xl:w-[min(38vw,calc(100svh-220px))]"
      : framing === "editor"
        ? isBeautyTemplate ? BEAUTY_PREVIEW_WHEEL_FRAME_CLASSES[beautyTemplateId!] : isRoseInstitutTemplate ? "w-[122%] max-w-none" : "w-[150%] max-w-none"
        : framing === "mobile-preview"
          ? isBeautyTemplate ? BEAUTY_PREVIEW_WHEEL_FRAME_CLASSES[beautyTemplateId!] : isRoseInstitutTemplate ? "w-[122%] max-w-none" : "w-[150%] max-w-none"
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
        style={{
          top: wheelTop,
          left: pageTemplate === "beauty-editorial" ? "53%" : undefined,
        }}
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
          style={{
            transform: `rotate(${rotation}deg)`,
            filter: isBeautyTemplate && pageTemplate !== "beauty-rose" ? beautyWheelShadow : undefined,
          }}
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
                <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 14} fill="none" stroke="#fffdfc" strokeWidth="1" />
                <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 12} fill="#fffdfc" stroke={roseAccent} strokeWidth="2" />
                <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 7} fill="none" stroke={isDefaultRoseColor ? "#f3cdd5" : deriveLighterHex(colors.rimColor, 0.68)} strokeWidth="1" />
                <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 2} fill="none" stroke="#fffdfc" strokeWidth="2" />
              </>
            ) : isBeautyTemplate ? (
              <>
                <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 13} fill={beautyTheme?.secondary ?? "#fff"} stroke={beautyOuterRingColor} strokeWidth={beautyRimWidth} />
                <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 9} fill="none" stroke={beautyRingHighlight} strokeWidth={pageTemplate === "beauty-pop" ? "3" : "1.5"} />
                <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 5} fill="none" stroke={beautyInnerRingColor} strokeWidth="1" />
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
              const textPoint = polarToCartesian(isRosePowderTemplate ? 208 : isBeautyTemplate ? 194 : 208, midAngle);
              const radialTextAngle = midAngle + 90;
              const labelLines = wrapSegmentLabel(segment.label);
              const textStyles = segmentTextStyles(labelLines, isRoseInstitutTemplate);
              if (isBeautyTemplate) {
                const manySegments = visualSegments.length >= 8;
                textStyles.fontSize = isRosePowderTemplate
                  ? manySegments ? 25 : visualSegments.length >= 6 ? 27 : 30
                  : manySegments ? 22 : visualSegments.length >= 6 ? 26 : 30;
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
                  ? beautySegmentColors[index]
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
                    stroke={isBeautyTemplate ? beautySeparatorColor : isRoseInstitutTemplate ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.9)"}
                    strokeWidth={isBeautyTemplate ? beautySeparatorWidth : isRoseInstitutTemplate ? "7" : "5"}
                    strokeLinejoin="round"
                  />
                  <text
                    x={textPoint.x}
                    y={textPoint.y}
                    fill={textColor}
                    fontFamily={isBeautyTemplate && beautyTheme ? textFontFamily(beautyTheme.font) : "Roboto, sans-serif"}
                    fontSize={String(textStyles.fontSize)}
                    fontWeight={isBeautyTemplate ? "600" : "850"}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={isBeautyTemplate ? undefined : `rotate(${radialTextAngle} ${textPoint.x} ${textPoint.y})`}
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
          ) : pageTemplate === "beauty-nude" ? (
            <svg
              aria-hidden="true"
              className="absolute pointer-events-none"
              style={{ top: "-1.2%", left: "50%", width: "11.4%", height: "16%", transform: "translateX(-50%)", overflow: "visible", filter: "drop-shadow(0 4px 5px rgba(91,66,37,.16))" }}
              viewBox="0 0 48 64"
            >
              <path d="M24 2 C36 2 44 10 44 22 C44 36 31 52 24 61 C17 52 4 36 4 22 C4 10 12 2 24 2 Z" fill={colors.rimColor} stroke="#fffaf0" strokeWidth="3" strokeLinejoin="round" />
              <path d="M24 8 C33 8 38 14 38 23 C38 33 29 45 24 51 C19 45 10 33 10 23 C10 14 15 8 24 8 Z" fill="rgba(255,255,255,.16)" />
            </svg>
          ) : <div
            className="absolute"
            style={{
              top: isRoseInstitutTemplate || isBeautyTemplate ? "-1.2%" : "31.2%",
              left: "50%",
              width: isRestaurantPopTemplate ? "12.4%" : isRoseInstitutTemplate ? "13.2%" : isBeautyTemplate ? pageTemplate === "beauty-editorial" ? "9.2%" : "11.4%" : "10.3%",
              height: isRestaurantPopTemplate ? "20.4%" : isRoseInstitutTemplate ? "18.5%" : isBeautyTemplate ? pageTemplate === "beauty-editorial" ? "14%" : "16%" : "18.9%",
              transform: "translateX(-50%)",
              clipPath: isBeautyTemplate ? BEAUTY_POINTER_SHAPES[beautyTemplateId!] : "polygon(50% 0, 84% 14%, 72% 76%, 50% 100%, 28% 76%, 16% 14%)",
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
                  background: isBeautyTemplate ? BEAUTY_POINTER_INNER_COLORS[beautyTemplateId!] : isRoseInstitutTemplate
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
          className={`okado-wheel-center-button absolute left-1/2 top-1/2 z-40 flex aspect-square ${isRestaurantPopTemplate ? "w-[21%]" : isRoseInstitutTemplate ? "w-[28%]" : isRosePowderTemplate ? "w-[25%]" : isBeautyTemplate ? "w-[30%]" : "w-[19.2%]"} -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full ${isRestaurantPopTemplate || pageTemplate === "classic" ? "border-0" : isRosePowderTemplate || isBeautyTemplate ? "border-2" : isRoseInstitutTemplate ? "border-[3px]" : "border-[4px]"} ${isBeautyTemplate && !isRosePowderTemplate ? `okado-beauty-wheel-center okado-beauty-wheel-center--${pageTemplate} relative isolate overflow-hidden` : ""} text-[19px] font-black uppercase transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-75 ${isRestaurantPopTemplate ? "font-anton" : "shadow-[0_16px_30px_rgba(15,23,42,0.16)]"}`}
          style={{
            width: isRosePowderTemplate ? "30%" : undefined,
            background: isRosePowderTemplate ? "#fffdfc" :
              buttonEnabled && !hasSpun
                ? isRoseInstitutTemplate || isBeautyTemplate
                  ? centerButtonBackground
                  : `linear-gradient(180deg, ${centerButtonBackground}, ${buttonStyle?.backgroundColor ?? colors.rimColor})`
                : "linear-gradient(180deg, #aeb8c7, #7f8a9d)",
            color: isRosePowderTemplate
              ? (buttonStyle?.backgroundColor?.toLowerCase() === colors.loseColor.toLowerCase() ? roseAccent : buttonStyle?.backgroundColor ?? roseAccent)
              : isBeautyTemplate
                ? beautyWheelButtonTextColor(beautyTemplateId!, centerButtonBackground, buttonStyle?.textColor)
                : buttonStyle?.textColor ?? "#ffffff",
            borderColor: isRosePowderTemplate ? "#d58a9a" : isRestaurantPopTemplate ? "transparent" : isRoseInstitutTemplate || isBeautyTemplate ? "#ffffff" : buttonStyle?.borderColor ?? "#ffffff",
            fontSize: isRestaurantPopTemplate
              ? "clamp(0.88rem, 5.1cqw, 1.75rem)"
              : isRoseInstitutTemplate
                ? "clamp(0.92rem, 5.6cqw, 1.8rem)"
              : "clamp(0.84rem, 4.7cqw, 1.55rem)",
            boxShadow: isRosePowderTemplate ? "0 4px 12px rgba(90,45,60,.10), 0 0 0 3px rgba(255,253,252,.88)" : isRestaurantPopTemplate ? "none" : isBeautyTemplate ? `0 6px 16px ${withAlpha(colors.rimColor, 0.2)}, 0 0 0 2px ${withAlpha(beautyTheme?.secondary ?? "#ffffff", 0.88)}` : isRoseInstitutTemplate ? "0 8px 18px rgba(11,78,162,0.22)" : undefined,
          }}
        >
          {isRosePowderTemplate ? (
            <span className="flex flex-col items-center">
              <RoseFlowerMark className="h-[clamp(21px,5.6cqw,22px)] w-[clamp(21px,5.6cqw,22px)]" />
              <span className="mt-1 text-[clamp(15px,4.7cqw,21px)] font-semibold tracking-[0.045em]">
                {isSpinning ? "..." : buttonLabel}
              </span>
            </span>
          ) : isBeautyTemplate ? (
            <span className="relative z-10 flex flex-col items-center gap-1">
              <Pointer aria-hidden="true" className="h-[clamp(21px,7.2cqw,36px)] w-[clamp(21px,7.2cqw,36px)]" strokeWidth={2.15} />
              <span className="okado-beauty-wheel-center-label text-[clamp(10px,2.9cqw,14px)] font-semibold tracking-[0.075em]">{isSpinning ? "..." : buttonLabel}</span>
            </span>
          ) : isSpinning ? "..." : buttonLabel}
        </button>
      </div>
    </div>
  );
}
