"use client";

import { useEffect, useState } from "react";
import { HalloweenWheelVisual } from "@/components/public/halloween-wheel-art";
import { halloweenWheelVisualSegments } from "@/lib/halloween-wheel-theme";
import { BeautyWheelPointer, BeautyWheelRim } from "@/components/public/beauty-wheel-finishes";
import { beautyCenterFinish, beautyCenterRelief, beautyWheelRimColor } from "@/lib/beauty-wheel-finishes";
import { textFontFamily } from "@/lib/format";
import { dynamicWheelLightSegmentColor } from "@/lib/campaign-defaults";
import { legibleSegmentTextColor } from "@/lib/color-contrast";
import { wheelButtonBackgroundForWhiteText } from "@/lib/wheel-button-contrast";
import { beautyWheelButtonTextColor, beautyWheelLegibleText, beautyWheelTheme, isBeautyWheelTemplate, type BeautyWheelTemplateId } from "@/lib/beauty-wheel-themes";
import { rosePowderVisualSegments } from "@/lib/wheel-segments";
import { buildBeautyWheelSegmentColors, limitBeautyWheelSegments } from "@/lib/beauty-wheel-segments";
import { enforceMinimumWheelPrizeLabelFontSize } from "@/lib/wheel-labels";

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
  pageTemplate?: "classic" | "restaurant-pop" | "rose-institut" | "halloween-gold" | BeautyWheelTemplateId;
};

const SVG_SIZE = 640;
const CENTER = SVG_SIZE / 2;
const OUTER_RADIUS = 304;
const INNER_RADIUS = 76;
const MAX_LABEL_LINES = 3;

const BEAUTY_PUBLIC_WHEEL_FRAME_CLASSES: Record<BeautyWheelTemplateId, string> = {
  "beauty-rose": "top-[18px] w-[min(86vw,calc(100dvh-315px),380px)] sm:w-[min(86vw,calc(100dvh-315px),380px)] md:w-[min(46vw,calc(100dvh-260px),390px)] lg:w-[min(39vw,calc(100dvh-260px),390px)]",
  "beauty-nude": "top-1 w-[min(86vw,calc(100dvh-315px),380px)] sm:w-[min(86vw,calc(100dvh-315px),380px)] md:w-[min(46vw,calc(100dvh-260px),390px)] lg:w-[min(39vw,calc(100dvh-260px),390px)]",
  "beauty-botanical": "top-1 w-[min(86vw,calc(100dvh-315px),380px)] sm:w-[min(86vw,calc(100dvh-315px),380px)] md:w-[min(46vw,calc(100dvh-260px),390px)] lg:w-[min(39vw,calc(100dvh-260px),390px)]",
  "beauty-pop": "top-1 w-[min(86vw,calc(100dvh-315px),380px)] sm:w-[min(86vw,calc(100dvh-315px),380px)] md:w-[min(46vw,calc(100dvh-260px),390px)] lg:w-[min(39vw,calc(100dvh-260px),390px)]",
  "beauty-editorial": "top-1 w-[min(86vw,calc(100dvh-315px),380px)] sm:w-[min(86vw,calc(100dvh-315px),380px)] md:w-[min(46vw,calc(100dvh-260px),390px)] lg:w-[min(39vw,calc(100dvh-260px),390px)]",
  "beauty-tech": "top-1 w-[min(86vw,calc(100dvh-315px),380px)] sm:w-[min(86vw,calc(100dvh-315px),380px)] md:w-[min(46vw,calc(100dvh-260px),390px)] lg:w-[min(39vw,calc(100dvh-260px),390px)]",
};

const BEAUTY_PREVIEW_WHEEL_FRAME_CLASSES: Record<BeautyWheelTemplateId, string> = {
  "beauty-rose": "w-[90%] max-w-none",
  "beauty-nude": "w-[86%] max-w-none",
  "beauty-botanical": "w-[86%] max-w-none",
  "beauty-pop": "w-[86%] max-w-none",
  "beauty-editorial": "w-[86%] max-w-none",
  "beauty-tech": "w-[86%] max-w-none",
};

const BEAUTY_POINTER_PATHS: Record<Exclude<BeautyWheelTemplateId, "beauty-rose">, string> = {
  "beauty-nude": "M24 2 C35 2 43 10 43 21 C43 34 32 48 24 62 C16 48 5 34 5 21 C5 10 13 2 24 2Z",
  "beauty-botanical": "M24 2 C35 3 41 11 41 21 C41 34 31 48 24 62 C17 48 7 34 7 21 C7 11 13 3 24 2Z",
  "beauty-pop": "M24 2 C37 2 44 11 44 22 C44 35 33 51 24 62 C15 51 4 35 4 22 C4 11 11 2 24 2Z",
  "beauty-editorial": "M24 2 C33 8 41 15 41 24 C41 35 32 49 24 62 C16 49 7 35 7 24 C7 15 15 8 24 2Z",
  "beauty-tech": "M24 2 C35 3 43 11 43 22 C43 35 32 50 24 62 C16 50 5 35 5 22 C5 11 13 3 24 2Z",
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

function describeBeautySeparator(angle: number, innerRadius: number) {
  const innerPoint = polarToCartesian(innerRadius, angle);
  const outerPoint = polarToCartesian(OUTER_RADIUS, angle);

  return `M ${innerPoint.x} ${innerPoint.y} L ${outerPoint.x} ${outerPoint.y}`;
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

function highContrastTextColor(fill: string) {
  const hex = fill.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return "#111827";
  const channels = [0, 2, 4].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  const darkContrast = (luminance + 0.05) / 0.05;
  const lightContrast = 1.05 / (luminance + 0.05);
  return darkContrast >= lightContrast ? "#111827" : "#ffffff";
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
  // Éclat keeps its original center, pointer and white rim (PR #461).
  const hasBeautyFinish = isBeautyTemplate;
  const isRosePowderTemplate = pageTemplate === "beauty-rose";
  const beautyTemplateId = isBeautyWheelTemplate(pageTemplate) ? pageTemplate : undefined;
  const beautyPointerTemplateId = isBeautyTemplate && !isRosePowderTemplate
    ? pageTemplate as Exclude<BeautyWheelTemplateId, "beauty-rose">
    : null;
  const beautyTheme = beautyWheelTheme(pageTemplate);
  const baseVisualSegments = pageTemplate === "halloween-gold"
    ? halloweenWheelVisualSegments(segments, winningSegmentId)
    : isRosePowderTemplate
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
    near: withAlpha(colors.loseColor, isRoseInstitutTemplate ? 0.11 : 0.2),
    far: withAlpha(colors.loseColor, isRoseInstitutTemplate ? 0.035 : 0.1),
  };
  const beautyRimWidth = (pageTemplate === "beauty-pop" ? 2.2 : pageTemplate === "beauty-nude" ? 1.5 : 2) + 1;
  const beautyOuterRingColor = beautyWheelRimColor(pageTemplate, colors.rimColor, colors.loseColor);
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
  const isClassicTemplate = pageTemplate === "classic";
  const dynamicLightSegmentColor = isClassicTemplate
    ? dynamicWheelLightSegmentColor(colors.loseColor, colors.alternateLoseColor)
    : colors.alternateLoseColor;
  const roseAccent = colors.loseColor.toLowerCase() === "#d58a9a" ? "#b95f75" : deriveDarkerHex(colors.loseColor);
  const centerButtonTextColor = isRosePowderTemplate
    ? (buttonStyle?.backgroundColor?.toLowerCase() === colors.loseColor.toLowerCase() ? roseAccent : buttonStyle?.backgroundColor ?? roseAccent)
    : isBeautyTemplate
      ? beautyWheelButtonTextColor(beautyTemplateId!, centerButtonBackground, buttonStyle?.textColor)
      : buttonStyle?.textColor ?? "#ffffff";
  const visibleCenterBackground = wheelButtonBackgroundForWhiteText(centerButtonBackground, centerButtonTextColor);
  const visibleCenterGradientEnd = wheelButtonBackgroundForWhiteText(
    buttonStyle?.backgroundColor ?? colors.rimColor,
    centerButtonTextColor,
  );
  const isDefaultRoseColor = colors.loseColor.toLowerCase() === "#d58a9a";
  const roseIvory = colors.alternateLoseColor.toLowerCase() === "#fff7f8" ? "#fffdfc" : colors.alternateLoseColor;
  const roseLight = isDefaultRoseColor ? "#f3cdd5" : deriveLighterHex(colors.loseColor, 0.67);
  const roseMedium = isDefaultRoseColor ? "#e7aebb" : deriveLighterHex(colors.loseColor, 0.4);
  const wheelTop =
    framing === "public" ? undefined : isRosePowderTemplate ? (framing === "mobile-preview" ? "calc(35% + 14px)" : "calc(40% + 14px)") : isBeautyTemplate ? (framing === "mobile-preview" ? "35%" : "40%") : isRoseInstitutTemplate ? "8px" : isClassicTemplate ? "54%" : isRestaurantPopTemplate ? "42%" : framing === "editor" ? "83%" : framing === "mobile-preview" ? "70%" : "62%";
  const wheelFrameSizeClass =
    framing === "public"
      ? isBeautyTemplate
        ? BEAUTY_PUBLIC_WHEEL_FRAME_CLASSES[beautyTemplateId!]
      : isRoseInstitutTemplate
        ? "top-1 w-[min(calc(100vw-32px),calc(100dvh-320px),430px)] sm:w-[min(calc(100vw-36px),calc(100dvh-320px),520px)] md:w-[min(52vw,640px)] lg:w-[min(48vw,680px)]"
        : isClassicTemplate
          ? "top-2 w-[116vw] max-w-none sm:w-[min(94vw,540px)] lg:w-[min(54vw,640px)]"
          : "top-2 w-[92vw] max-w-[440px] sm:w-[min(82vw,460px)] lg:w-[min(45vw,560px)]"
      : framing === "editor"
        ? isBeautyTemplate ? BEAUTY_PREVIEW_WHEEL_FRAME_CLASSES[beautyTemplateId!] : isRoseInstitutTemplate ? "w-full max-w-none" : isClassicTemplate ? "w-[116%] max-w-none" : "w-[92%] max-w-none"
        : framing === "mobile-preview"
          ? isBeautyTemplate ? BEAUTY_PREVIEW_WHEEL_FRAME_CLASSES[beautyTemplateId!] : isRoseInstitutTemplate ? "w-full max-w-none" : isClassicTemplate ? "w-[116%] max-w-none" : "w-[92%] max-w-none"
          : "w-full";
  const wheelTransformClass =
    framing === "public" || isRoseInstitutTemplate ? "-translate-x-1/2" : "-translate-x-1/2 -translate-y-1/2";

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

  if (pageTemplate === "halloween-gold") {
    return <HalloweenWheelVisual segments={visualSegments} rotation={rotation} spinning={isSpinning} disabled={!buttonEnabled || isSpinning || hasSpun} buttonLabel={buttonLabel} onClick={handleCentralButton} />;
  }

  return (
    <div className="relative h-full w-full overflow-visible" style={{ containerType: "inline-size" }}>
      <div
        className={`absolute left-1/2 aspect-square ${wheelTransformClass} ${wheelFrameSizeClass} ${
          isRosePowderTemplate
            ? "drop-shadow-[0_12px_30px_rgba(90,45,60,0.12)]"
          : isBeautyTemplate
            ? ""
          : isClassicTemplate
            ? "drop-shadow-[0_22px_34px_rgba(5,31,100,0.28)]"
            : isRoseInstitutTemplate
              ? ""
            : "drop-shadow-[0_12px_26px_rgba(45,24,85,0.15)]"
        }`}
        style={{
          top: wheelTop,
          left: pageTemplate === "beauty-editorial" ? "53%" : undefined,
        }}
      >
        {(isRoseInstitutTemplate || isBeautyTemplate || isRestaurantPopTemplate) && !isRosePowderTemplate ? (
          <div
            aria-hidden="true"
            data-testid={isRestaurantPopTemplate ? "signature-wheel-halo" : undefined}
            className="pointer-events-none absolute -inset-[10%] z-0 rounded-full"
            style={{
              background: isRestaurantPopTemplate
                ? `radial-gradient(circle, ${withAlpha(colors.loseColor, 0.22)} 0%, ${withAlpha(colors.loseColor, 0.11)} 48%, transparent 78%)`
                : `radial-gradient(circle, ${roseGlow.near} 0%, ${roseGlow.near} 54%, ${roseGlow.far} 68%, transparent 84%)`,
              filter: isBeautyTemplate ? "blur(18px)" : isRestaurantPopTemplate ? "blur(22px)" : "blur(14px)",
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
                  r={OUTER_RADIUS + 10}
                  fill="#fffdfa"
                  stroke="#ffffff"
                  strokeWidth="12"
                />
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={OUTER_RADIUS + 4}
                  fill="none"
                  stroke={withAlpha(colors.rimColor, 0.36)}
                  strokeWidth="2"
                />
              </>
            ) : hasBeautyFinish ? (
              <BeautyWheelRim color={isRosePowderTemplate ? roseAccent : beautyOuterRingColor} width={beautyRimWidth} fill={beautyTheme?.secondary ?? "#ffffff"} />
            ) : isRoseInstitutTemplate ? (
              <g data-testid="eclat-wheel-rim">
                <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 18} fill="#ffffff" stroke="#ffffff" strokeWidth="18" />
                <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 8} fill="none" stroke="rgba(11,78,162,0.12)" strokeWidth="2" />
              </g>
            ) : isClassicTemplate ? (
              <>
                <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 14} fill="#ffffff" stroke="#ffffff" strokeWidth="9" />
                <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 7} fill="none" stroke={colors.rimColor} strokeWidth="2" />
              </>
            ) : (
              <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 18} fill="#ffffff" stroke={colors.rimColor} strokeWidth="4" opacity="0.98" />
            )}
            {visualSegments.map((segment, index) => {
              const startAngle = index * segmentAngle + (isRosePowderTemplate || isBeautyTemplate ? 0 : 1.2);
              const endAngle = startAngle + segmentAngle - (isRosePowderTemplate || isBeautyTemplate ? 0 : 2.4);
              const midAngle = startAngle + (endAngle - startAngle) / 2;
              const textPoint = polarToCartesian(isRosePowderTemplate ? 208 : isBeautyTemplate ? 194 : 208, midAngle);
              const radialTextAngle = midAngle + 90;
              const uprightRadialTextAngle = radialTextAngle > 90 && radialTextAngle < 270
                ? radialTextAngle - 180
                : radialTextAngle;
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
                }
              }
              textStyles.fontSize = enforceMinimumWheelPrizeLabelFontSize(textStyles.fontSize);
              if (labelLines.length > 1) {
                textStyles.lineHeight = Math.max(
                  textStyles.lineHeight,
                  textStyles.fontSize * (isRosePowderTemplate ? 0.94 : 0.9),
                );
                textStyles.initialOffset = -((labelLines.length - 1) * textStyles.lineHeight) / 2;
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
                  : dynamicLightSegmentColor;
              const textColor = isBeautyTemplate
                ? beautyWheelLegibleText(fillColor, beautyTheme?.text)
                : legibleSegmentTextColor(
                    fillColor,
                    isRoseInstitutTemplate
                      ? buttonStyle?.backgroundColor ?? "#0b4ea2"
                      : segment.tone === "win" ? accent.ink : "#111827",
                  );

              return (
                <g key={segment.id}>
                  <path
                    d={describeSlice(startAngle, endAngle, isRosePowderTemplate ? 62 : INNER_RADIUS)}
                    fill={fillColor}
                    stroke={isBeautyTemplate ? "none" : "rgba(255,255,255,0.9)"}
                    strokeWidth={isRoseInstitutTemplate ? "7" : "5"}
                    strokeLinejoin="round"
                  />
                  {isBeautyTemplate ? (
                    <path
                      d={describeBeautySeparator(startAngle, isRosePowderTemplate ? 62 : INNER_RADIUS)}
                      fill="none"
                      stroke={beautySeparatorColor}
                      strokeWidth={beautySeparatorWidth}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}
                  <text
                    x={textPoint.x}
                    y={textPoint.y}
                    fill={textColor}
                    fontFamily={isBeautyTemplate || isRoseInstitutTemplate ? textFontFamily("dm-sans") : "Roboto, sans-serif"}
                    fontSize={String(textStyles.fontSize)}
                    fontWeight={isBeautyTemplate || isRoseInstitutTemplate ? "600" : "850"}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${isBeautyTemplate || isRoseInstitutTemplate ? uprightRadialTextAngle : radialTextAngle} ${textPoint.x} ${textPoint.y})`}
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
            {isRestaurantPopTemplate || isClassicTemplate
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
                      stroke={withAlpha(colors.rimColor, 0.34)}
                      strokeWidth="1.2"
                    />
                  );
                })
              : null}
          </svg>
        </div>

        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          {hasBeautyFinish ? (
            <BeautyWheelPointer color={isRosePowderTemplate ? roseAccent : beautyOuterRingColor}
              path={beautyPointerTemplateId ? BEAUTY_POINTER_PATHS[beautyPointerTemplateId] : undefined}
              className={isRosePowderTemplate
                ? "absolute left-1/2 top-[-2.6%] h-[17.6%] w-[11%] -translate-x-1/2 overflow-visible"
                : "absolute left-1/2 top-[-2.8%] h-[17.6%] w-[12.54%] -translate-x-1/2 overflow-visible"} />
          ) : isClassicTemplate || isRestaurantPopTemplate ? (
            <svg
              aria-hidden="true"
              className={`absolute left-1/2 -translate-x-1/2 overflow-visible ${isClassicTemplate ? "top-[-4%] h-[17%] w-[13%]" : "top-[-3%] h-[16%] w-[12%]"}`}
              viewBox="0 0 52 58"
              style={{ filter: "drop-shadow(0 4px 5px rgba(17,24,39,.25))" }}
            >
              {isClassicTemplate ? (
                <>
                  <path d="M8 5 Q5 5 7 11 L22 49 Q26 57 30 49 L45 11 Q47 5 44 5 Z" fill="#ffffff" stroke={colors.loseColor} strokeWidth="8" strokeLinejoin="round" />
                  <path d="M8 5 Q5 5 7 11 L22 49 Q26 57 30 49 L45 11 Q47 5 44 5 Z" fill="#ffffff" stroke="#ffffff" strokeWidth="4" strokeLinejoin="round" />
                </>
              ) : (
                <path d="M12 4 C6 4 4 8 6 14 L21 47 C23 55 29 55 31 47 L46 14 C48 8 46 4 40 4 Z" fill={colors.loseColor} stroke="#ffffff" strokeWidth="4" strokeLinejoin="round" />
              )}
            </svg>
          ) : <div
            className="absolute"
            data-testid={isRoseInstitutTemplate ? "eclat-wheel-pointer" : undefined}
            style={{
              top: isRoseInstitutTemplate || isBeautyTemplate || isRestaurantPopTemplate ? "-1.2%" : "31.2%",
              left: "50%",
              width: isRestaurantPopTemplate ? "12.4%" : isRoseInstitutTemplate ? "13.2%" : "10.3%",
              height: isRestaurantPopTemplate ? "20.4%" : isRoseInstitutTemplate ? "18.5%" : "18.9%",
              transform: "translateX(-50%)",
              clipPath: "polygon(50% 0, 84% 14%, 72% 76%, 50% 100%, 28% 76%, 16% 14%)",
              background: isRestaurantPopTemplate
                ? "#fffdf7"
                : isRoseInstitutTemplate
                  ? "#ffffff"
                : "linear-gradient(180deg, #ffffff 0%, #f8fafc 62%, #ffffff 100%)",
              filter: isRoseInstitutTemplate
                ? "drop-shadow(0 6px 10px rgba(11,78,162,0.18))"
                : "drop-shadow(0 12px 18px rgba(15,23,42,0.2))",
            }}
          >
            {isRestaurantPopTemplate || isRoseInstitutTemplate ? (
              <div
                className="absolute inset-[9%]"
                style={{
                  clipPath: "polygon(50% 0, 82% 18%, 67% 73%, 50% 94%, 33% 73%, 18% 18%)",
                  background: isRoseInstitutTemplate
                    ? colors.loseColor
                    : `linear-gradient(180deg, ${colors.rimColor}, ${colors.winColor})`,
                }}
              />
            ) : null}
          </div>}
          {!isRestaurantPopTemplate && !isRoseInstitutTemplate && !isBeautyTemplate && !isClassicTemplate ? (
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
          aria-label={isBeautyTemplate || isRoseInstitutTemplate ? (isSpinning ? "La roue tourne" : "Jouer à la roue") : undefined}
          onClick={handleCentralButton}
          disabled={!buttonEnabled || isSpinning || hasSpun}
          className={`okado-wheel-center-button absolute left-1/2 top-1/2 z-40 flex aspect-square ${isRestaurantPopTemplate ? "w-[27%]" : isClassicTemplate ? "w-[28%]" : isRoseInstitutTemplate ? "w-[28%]" : isRosePowderTemplate ? "w-[25%]" : pageTemplate === "beauty-botanical" ? "w-[33%]" : pageTemplate === "beauty-nude" ? "w-[31.5%]" : isBeautyTemplate ? "w-[30%]" : "w-[19.2%]"} -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full ${isClassicTemplate || isRestaurantPopTemplate ? "border-[5px]" : isRosePowderTemplate || isBeautyTemplate ? "border-2" : isRoseInstitutTemplate ? "border-[3px]" : "border-[4px]"} ${hasBeautyFinish ? `okado-beauty-wheel-center okado-beauty-wheel-center--${pageTemplate} isolate overflow-hidden` : ""} text-[19px] font-black uppercase transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-100 shadow-[0_10px_20px_rgba(15,23,42,0.16)]`}
          style={{
            width: isRosePowderTemplate ? "30%" : undefined,
            background: hasBeautyFinish ? beautyCenterFinish(isRosePowderTemplate ? "#fffdfc" : buttonEnabled && !hasSpun ? visibleCenterBackground : "#7f8a9d") :
              buttonEnabled && !hasSpun
                ? isRoseInstitutTemplate || isBeautyTemplate || isClassicTemplate || isRestaurantPopTemplate
                  ? visibleCenterBackground
                  : `linear-gradient(180deg, ${visibleCenterBackground}, ${visibleCenterGradientEnd})`
                : "linear-gradient(180deg, #aeb8c7, #7f8a9d)",
            color: isRosePowderTemplate
              ? (buttonStyle?.backgroundColor?.toLowerCase() === colors.loseColor.toLowerCase() ? roseAccent : buttonStyle?.backgroundColor ?? roseAccent)
              : isBeautyTemplate
                ? beautyWheelButtonTextColor(beautyTemplateId!, centerButtonBackground, buttonStyle?.textColor)
                : isClassicTemplate || isRestaurantPopTemplate
                  ? highContrastTextColor(centerButtonBackground)
                  : centerButtonTextColor,
            borderColor: hasBeautyFinish ? beautyCenterRelief(isRosePowderTemplate ? roseAccent : centerButtonBackground).borderColor : isRoseInstitutTemplate || isClassicTemplate || isRestaurantPopTemplate ? "#ffffff" : buttonStyle?.borderColor ?? "#ffffff",
            fontSize: isClassicTemplate
              ? "clamp(0.88rem, 5.1cqw, 1.75rem)"
              : isRestaurantPopTemplate
                ? "clamp(0.92rem, 5cqw, 1.68rem)"
              : isRoseInstitutTemplate
                ? "clamp(0.92rem, 5.6cqw, 1.8rem)"
              : "clamp(0.84rem, 4.7cqw, 1.55rem)",
            boxShadow: hasBeautyFinish ? beautyCenterRelief(isRosePowderTemplate ? roseAccent : centerButtonBackground).boxShadow : isClassicTemplate || isRestaurantPopTemplate ? `0 6px 20px ${withAlpha(colors.loseColor, 0.26)}, 0 0 0 2px ${withAlpha(colors.rimColor, 0.24)}` : isRoseInstitutTemplate ? "0 8px 18px rgba(11,78,162,0.22)" : undefined,
            WebkitTextStroke: isRestaurantPopTemplate ? "0.35px currentColor" : undefined,
          }}
        >
          {hasBeautyFinish ? <span className="okado-beauty-wheel-center-label relative z-10">{isSpinning ? "..." : buttonLabel}</span> : isRoseInstitutTemplate ? <span className="okado-eclat-play-label">{isSpinning ? "..." : buttonLabel}</span> : isSpinning ? "..." : buttonLabel}
        </button>
      </div>
    </div>
  );
}
