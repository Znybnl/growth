"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import {
  DEFAULT_SCRATCH_PRIMARY_COLOR,
  DEFAULT_SCRATCH_SUBTITLE,
  defaultScratchTextColor,
  scratchTemplatePrimaryColor,
} from "@/lib/campaign-defaults";
import { scratchVisualTheme, type ImmersiveScratchTemplateId } from "@/lib/beauty-scratch-templates";
import { christmasScratchTemplate } from "@/lib/christmas-scratch-templates";
import { halloweenScratchTemplate } from "@/lib/halloween-scratch-template";
import { BRUSH_CLIP_PATH, SCALLOPED_TICKET_CLIP_PATH, SMOOTH_FESTIVE_BRUSH_CLIP_PATH } from "@/lib/scratch-surface-shapes";

type ScratchTemplateId = ImmersiveScratchTemplateId;

type ImmersiveScratchTicketProps = {
  accent: {
    ink: string;
    paper: string;
    signal: string;
  };
  resultLabel: string;
  enabled: boolean;
  onReveal: () => void;
  onStart?: () => void;
  onScratchStart?: () => void;
  template: ScratchTemplateId;
  logoMode?: "none" | "image" | "text";
  logoText?: string;
  logoUrl?: string;
  headline?: string;
  secondaryText?: string;
  headingTextColor?: string;
  logoTextColor?: string;
  headingFontClass?: string;
  headingFontSize?: string;
  headingFontSizePx?: number;
  headingFontWeight?: number;
  headingAlignmentClass?: string;
  logoAlignmentClass?: string;
  logoBottomSpacingPx?: number;
  textToScratchSpacingPx?: number;
  subtitleSpacingPx?: number;
  logoWidthPx?: number;
  logoTextSizePx?: number;
  /** Let editor previews use the full phone frame width while keeping the public game constrained. */
  fitContainer?: boolean;
};

const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 430;

const ISSUE_724_SCRATCH_STYLES: Record<string, {
  badge: string;
  badgeBorder: string;
  logoColor: string;
  revealBackground: string;
  revealText: string;
  scratchRotationDeg?: number;
}> = {
  "scratch-christmas-evergreen": {
    badge: "rgba(255, 247, 230, .92)",
    badgeBorder: "rgba(178, 118, 67, .72)",
    logoColor: "#173c34",
    revealBackground: "#fff8e8",
    revealText: "#25473d",
    scratchRotationDeg: -1.1,
  },
  "scratch-christmas-champagne": {
    badge: "rgba(255, 250, 240, .94)",
    badgeBorder: "rgba(175, 128, 67, .72)",
    logoColor: "#8f6931",
    revealBackground: "#fff8e9",
    revealText: "#563a22",
    scratchRotationDeg: 0.9,
  },
  "scratch-christmas-retro": {
    badge: "rgba(255, 247, 230, .85)",
    badgeBorder: "rgba(178, 118, 67, .70)",
    logoColor: "#3b5547",
    revealBackground: "#fff7e6",
    revealText: "#56331f",
  },
  "scratch-christmas-noir-or": {
    badge: "rgba(20, 17, 13, .88)",
    badgeBorder: "rgba(229, 199, 124, .92)",
    logoColor: "#e5c77c",
    revealBackground: "#f5e3bd",
    revealText: "#3e2b17",
    scratchRotationDeg: -1.2,
  },
};

function withAlpha(color: string, alpha: string) {
  const normalized = color.replace("#", "");
  return /^[0-9a-f]{6}$/i.test(normalized) ? `#${normalized}${alpha}` : color;
}

function blendWithWhite(color: string, ratio: number) {
  const normalized = color.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return "#f8fafc";

  return `#${[0, 2, 4]
    .map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16))
    .map((channel) => Math.round(channel + (255 - channel) * ratio))
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function readableTextColor(color: string) {
  const normalized = color.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return "#ffffff";
  const channels = [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
  const luminance = (0.299 * channels[0] + 0.587 * channels[1] + 0.114 * channels[2]) / 255;
  return luminance > 0.66 ? "#14213d" : "#ffffff";
}

function highestContrastTextColor(color: string) {
  const normalized = color.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return "#ffffff";
  const channels = [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255);
  const relativeLuminance = channels
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const whiteContrast = 1.05 / (relativeLuminance + 0.05);
  const darkContrast = (relativeLuminance + 0.05) / 0.05;
  return whiteContrast >= darkContrast ? "#ffffff" : "#14213d";
}

function GiftIllustration({ color }: { color: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 220 220" className="h-full w-full">
      <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
        <path d="M46 86h128v88H46z" fill={withAlpha(color, "38")} strokeWidth="5" />
        <path d="M38 70h144v28H38z" fill={withAlpha(color, "58")} strokeWidth="5" />
        <path d="M110 70v104" strokeWidth="7" />
        <path d="M65 70c-33-34 13-53 45 0M155 70c33-34-13-53-45 0" strokeWidth="7" />
        <path d="M54 116h112M54 145h112" opacity=".42" strokeWidth="3" />
      </g>
      <g fill={color} opacity=".82">
        <circle cx="28" cy="46" r="5" />
        <circle cx="194" cy="49" r="4" />
        <path d="m26 126 7-14 7 14-7 14zM184 130l6-12 6 12-6 12z" />
      </g>
    </svg>
  );
}

function VaultIllustration({ color }: { color: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 220 220"
      className="h-full w-full drop-shadow-[0_0_16px_rgba(134,232,255,0.34)]"
    >
      <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
        <rect x="42" y="38" width="136" height="144" rx="18" fill={withAlpha(color, "22")} strokeWidth="6" />
        <rect x="56" y="52" width="108" height="116" rx="11" fill={withAlpha(color, "12")} strokeWidth="4" />
        <circle cx="110" cy="108" r="28" fill={withAlpha(color, "22")} strokeWidth="5" />
        <circle cx="110" cy="108" r="8" fill={color} strokeWidth="4" />
        <path d="M110 80v-10M110 146v-10M82 108H72M148 108h-10" strokeWidth="4" />
        <path d="M138 136c11-6 17-14 17-25" strokeWidth="6" />
        <path d="M155 111v16M155 127h-15" strokeWidth="5" />
        <path d="M70 38v-9M150 38v-9" strokeWidth="4" />
      </g>
      <g fill={color} opacity=".86">
        <circle cx="30" cy="62" r="4" />
        <circle cx="192" cy="76" r="5" />
        <path d="m188 150 6-12 6 12-6 12zM28 148l5-10 5 10-5 10z" />
      </g>
    </svg>
  );
}

function ScratchMark({ color }: { color: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 420 230" className="h-full w-full">
      <path
        d="M46 168c14-70 46-97 70-43 17 38 16 85 36 76 24-11 1-130 31-155 24-20 33 38 39 78 7 49 25 62 42 34 24-42 25-108 50-103 31 6 2 104 24 113 20 8 31-23 43-45"
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray="2 15"
      />
      <path d="M205 32c10 9 18 20 23 35" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" opacity=".65" />
    </svg>
  );
}

export function ImmersiveScratchTicket({
  accent,
  resultLabel,
  enabled,
  onReveal,
  onStart,
  onScratchStart,
  template,
  logoMode = "text",
  logoText,
  logoUrl,
  headline,
  secondaryText,
  headingTextColor,
  logoTextColor,
  headingFontClass,
  headingFontWeight = 600,
  headingAlignmentClass = "text-center",
  logoAlignmentClass = "justify-center",
  logoBottomSpacingPx = 32,
  textToScratchSpacingPx = 20,
  subtitleSpacingPx = 15,
  logoWidthPx = 170,
  logoTextSizePx = 30,
  fitContainer = false,
  headingFontSize = "32px",
  headingFontSizePx,
}: ImmersiveScratchTicketProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const revealedRef = useRef(false);
  const scratchStartedRef = useRef(false);
  const checksRef = useRef(0);
  const [revealed, setRevealed] = useState(false);
  const [hasTouched, setHasTouched] = useState(false);
  const isVault = template === "scratch-vault";
  const isConfetti = template === "scratch-confetti";
  const isCoral = template === "scratch-coral";
  const isLilac = template === "scratch-lilac";
  const isSunburst = template === "scratch-sunburst";
  const beautyTheme = scratchVisualTheme(template);
  const christmasTheme = christmasScratchTemplate(template);
  const halloweenTheme = halloweenScratchTemplate(template);
  const seasonalTheme = christmasTheme || halloweenTheme;
  const scratchShape = christmasTheme?.scratchShape;
  const isDecorativeTicket = scratchShape === "ticket";
  const isFestiveBrushScratch = christmasTheme?.id === "scratch-christmas-evergreen"
    || christmasTheme?.id === "scratch-christmas-champagne"
    || christmasTheme?.id === "scratch-christmas-noir-or";
  const scratchClipPath = isFestiveBrushScratch
    ? SMOOTH_FESTIVE_BRUSH_CLIP_PATH
    : scratchShape === "ticket"
    ? SCALLOPED_TICKET_CLIP_PATH
    : scratchShape === "brush"
      ? BRUSH_CLIP_PATH
      : undefined;
  const isRetroScratch = christmasTheme?.id === "scratch-christmas-retro";
  const issue724ScratchStyle = christmasTheme ? ISSUE_724_SCRATCH_STYLES[christmasTheme.id] : undefined;
  const isIssue724IllustratedScratch = Boolean(issue724ScratchStyle);
  const canvasWidth = isFestiveBrushScratch ? 774 : scratchShape === "brush" ? 700 : isDecorativeTicket ? 660 : CANVAS_WIDTH;
  const canvasHeight = CANVAS_HEIGHT;
  const configuredPrimary = accent.signal;
  const primary = scratchTemplatePrimaryColor(configuredPrimary, template);
  const hasCustomPrimary =
    configuredPrimary.trim().toLowerCase() !== DEFAULT_SCRATCH_PRIMARY_COLOR &&
    !isConfetti &&
    !isLilac;
  const ticketBaseColor = isLilac
    ? primary
    : isVault
      ? "#171d38"
      : isConfetti
        ? "#71364a"
        : primary;
  const illustrationColor = isLilac
    ? blendWithWhite(ticketBaseColor, 0.72)
    : isVault
      ? hasCustomPrimary
        ? blendWithWhite(ticketBaseColor, 0.58)
        : "#86e8ff"
      : isConfetti
        ? "#f4d89c"
        : blendWithWhite(ticketBaseColor, 0.48);
  const defaultInk = beautyTheme?.text ?? (isVault || isConfetti
    ? "#f8fbff"
    : isLilac
      ? defaultScratchTextColor(template)
      : isSunburst
        ? "#3b2500"
        : "#111827");
  const ink = halloweenTheme?.text || headingTextColor || defaultInk;
  const resultInk = highestContrastTextColor(ticketBaseColor);
  const resultTextShadow = resultInk === "#ffffff"
    ? "0 2px 10px rgba(0, 0, 0, 0.58)"
    : "0 2px 8px rgba(255, 255, 255, 0.72)";
  const resolvedHeadingFontClass = headingFontClass || beautyTheme?.fontClass || (isLilac ? "font-fredoka" : "font-display");
  const displayHeadline = headline?.trim() || DEFAULT_SCRATCH_SUBTITLE;
  const instruction = "Grattez la carte pour révéler votre cadeau.";
  const scratchFinish = christmasTheme?.scratch ?? beautyTheme?.scratch;
  const coverColor = scratchFinish?.base ?? (isVault ? "#171d38" : isConfetti ? "#71364a" : primary);
  const coverHighlight = scratchFinish?.highlight ?? (isSunburst ? blendWithWhite(coverColor, 0.2) : blendWithWhite(coverColor, 0.34));

  const surfaceClass = beautyTheme
    ? isFestiveBrushScratch
      ? "mx-auto aspect-[1.8/1] w-[92%] max-w-[320px]"
      : scratchShape === "brush"
      ? "mx-auto aspect-[2.2/1] w-full max-w-[340px]"
      : isDecorativeTicket
    ? "mx-auto aspect-[1.9/1] w-full max-w-[340px] p-[16px]"
        : "mx-auto aspect-square w-[70%] max-w-[216px] rounded-full"
    : isSunburst
    ? "mx-auto aspect-[1.18/1] w-[70%] max-w-[216px]"
    : "mx-auto aspect-square w-[70%] max-w-[216px]";
  const surfaceRimClass = isDecorativeTicket
    ? "border-2 border-[#b52a29] bg-[#b52a29] shadow-[0_12px_28px_rgba(90,25,18,.25)]"
    : scratchShape === "brush"
      ? "drop-shadow-[0_12px_18px_rgba(73,47,25,.2)]"
    : beautyTheme?.id === "beauty-scratch-noir-or"
    ? "border-2 border-[#f0d798] ring-1 ring-[#9b7134]/75"
    : beautyTheme?.id === "beauty-scratch-lilas"
      ? "border-2 border-[#fffaff] ring-1 ring-[#8a7893]/60"
      : beautyTheme
        ? "border-2 border-[#fff7e8] ring-1 ring-[#ae9161]/55"
        : "";

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    if (beautyTheme) canvas.dataset.foilLoaded = "false";

    const gradient = context.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    const cover = coverColor;
    const highlight = coverHighlight;
    if (beautyTheme?.id === "beauty-scratch-nude" || beautyTheme?.id === "scratch-nude-classic") {
      gradient.addColorStop(0, "#c4a675");
      gradient.addColorStop(0.24, "#ead8b2");
      gradient.addColorStop(0.52, "#c9ad7c");
      gradient.addColorStop(0.78, "#e3d0a9");
      gradient.addColorStop(1, "#b99862");
    } else if (beautyTheme?.id === "beauty-scratch-botanical") {
      gradient.addColorStop(0, "#c3a875");
      gradient.addColorStop(0.38, "#eee1c4");
      gradient.addColorStop(0.7, "#d2bb89");
      gradient.addColorStop(1, "#b3935d");
    } else if (beautyTheme?.id === "beauty-scratch-noir-or") {
      gradient.addColorStop(0, "#98713a");
      gradient.addColorStop(0.32, "#e8cf8c");
      gradient.addColorStop(0.62, "#c39b52");
      gradient.addColorStop(1, "#8f6834");
    } else if (beautyTheme?.id === "beauty-scratch-lilas") {
      gradient.addColorStop(0, "#b9aebe");
      gradient.addColorStop(0.36, "#eee8ef");
      gradient.addColorStop(0.68, "#d5cbd9");
      gradient.addColorStop(1, "#a99aaf");
    } else if (beautyTheme?.id === "beauty-scratch-corail") {
      gradient.addColorStop(0, "#c29e6b");
      gradient.addColorStop(0.35, "#f0dfbf");
      gradient.addColorStop(0.68, "#d7b780");
      gradient.addColorStop(1, "#b18a56");
    } else {
      gradient.addColorStop(0, cover);
      gradient.addColorStop(0.42, highlight);
      gradient.addColorStop(0.72, cover);
      gradient.addColorStop(1, isSunburst ? blendWithWhite(cover, 0.04) : blendWithWhite(cover, 0.08));
    }
    context.globalCompositeOperation = "source-over";
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvasWidth, canvasHeight);

    if (!beautyTheme && !christmasTheme) {
      context.save();
      context.globalAlpha = isSunburst ? 0.14 : 0.18;
      context.strokeStyle = isSunburst ? "#ffffff" : readableTextColor(primary);
      context.lineWidth = 2;
      for (let offset = -canvasHeight; offset < canvasWidth; offset += isSunburst ? 28 : 34) {
        context.beginPath();
        context.moveTo(offset, 0);
        context.lineTo(offset + canvasHeight, canvasHeight);
        context.stroke();
      }
      context.restore();
    }

    if (isRetroScratch) {
      context.save();
      context.globalAlpha = 0.1;
      context.strokeStyle = "#ffffff";
      context.lineWidth = 1;
      for (let y = 5; y < canvasHeight; y += 7) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(canvasWidth, y);
        context.stroke();
      }
      context.globalAlpha = 0.08;
      context.strokeStyle = "#9e7049";
      for (let offset = -canvasHeight; offset < canvasWidth; offset += 13) {
        context.beginPath();
        context.moveTo(offset, 0);
        context.lineTo(offset + canvasHeight, canvasHeight);
        context.stroke();
      }
      context.restore();
    }

    let cancelled = false;
    if (scratchFinish?.texture) {
      const texture = new window.Image();
      texture.onload = () => {
        if (cancelled) return;
        const currentContext = canvasRef.current?.getContext("2d");
        if (!currentContext) return;
        currentContext.save();
        currentContext.globalCompositeOperation = "source-over";
        currentContext.globalAlpha = scratchFinish.textureOpacity;
        currentContext.drawImage(texture, 0, 0, canvasWidth, canvasHeight);
        currentContext.restore();
        canvas.dataset.foilLoaded = "true";
      };
      texture.onerror = () => {
        if (cancelled) return;
        canvas.dataset.foilLoaded = "error";
      };
      texture.src = scratchFinish.texture;
    } else if (beautyTheme) {
      if (!christmasTheme) {
        context.save();
        context.globalAlpha = isDecorativeTicket ? .2 : .16;
        context.strokeStyle = "#ffffff";
        context.lineWidth = 2;
        for (let offset = -canvasHeight; offset < canvasWidth; offset += 26) {
          context.beginPath();
          context.moveTo(offset, 0);
          context.lineTo(offset + canvasHeight, canvasHeight);
          context.stroke();
        }
        context.restore();
      }
      canvas.dataset.foilLoaded = "true";
    }
    if (issue724ScratchStyle && !scratchFinish?.texture) canvas.dataset.foilLoaded = "true";

    checksRef.current = 0;
    revealedRef.current = false;
    scratchStartedRef.current = false;
    setRevealed(false);
    setHasTouched(false);
    return () => {
      cancelled = true;
    };
  }, [beautyTheme, canvasHeight, canvasWidth, christmasTheme, coverColor, coverHighlight, isConfetti, isCoral, isDecorativeTicket, isLilac, isRetroScratch, isSunburst, isVault, issue724ScratchStyle, primary, resultLabel, scratchFinish?.texture, scratchFinish?.textureOpacity]);

  function reveal() {
    if (revealedRef.current) return;
    revealedRef.current = true;
    setRevealed(true);
    onReveal();
  }

  function scratch(x: number, y: number) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !enabled || revealedRef.current) return;

    context.globalCompositeOperation = "destination-out";
    context.beginPath();
    context.arc(x, y, isSunburst ? 28 : 32, 0, Math.PI * 2);
    context.fill();
    checksRef.current += 1;
    if (checksRef.current % 9 !== 0) return;

    checkReveal();
  }

  function checkReveal() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || revealedRef.current) return;

    const { data } = context.getImageData(0, 0, canvasWidth, canvasHeight);
    let cleared = 0;
    let samples = 0;
    for (let index = 3; index < data.length; index += 20) {
      samples += 1;
      if (data[index] === 0) cleared += 1;
    }
    if (samples > 0 && cleared / samples > 0.3) reveal();
  }

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const surface = event.currentTarget.closest<HTMLElement>('[data-testid="scratch-ticket-surface"]');
    if (surface) {
      const transform = window.getComputedStyle(surface).transform;
      if (transform !== "none") {
        const bounds = surface.getBoundingClientRect();
        const localPoint = new DOMPoint(
          event.clientX - bounds.left - bounds.width / 2,
          event.clientY - bounds.top - bounds.height / 2,
        ).matrixTransform(new DOMMatrixReadOnly(transform).inverse());
        return {
          x: ((localPoint.x + surface.offsetWidth / 2) / surface.offsetWidth) * canvasWidth,
          y: ((localPoint.y + surface.offsetHeight / 2) / surface.offsetHeight) * canvasHeight,
        };
      }
    }
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvasWidth,
      y: ((event.clientY - rect.top) / rect.height) * canvasHeight,
    };
  }

  const rootClass = `flex flex-col pb-8 ${seasonalTheme ? "pt-10" : fitContainer ? "pt-2" : "pt-[52px]"} ${beautyTheme
    ? "bg-transparent px-6"
    : isVault || isConfetti
    ? "bg-transparent px-5"
    : isLilac
      ? "bg-transparent px-6"
      : isCoral
        ? "bg-transparent px-5"
        : isSunburst
          ? "bg-transparent px-0"
          : "bg-[#111936] px-5"}`;

  return (
    <div
      className={`mx-auto flex w-full flex-1 flex-col ${fitContainer ? "max-w-full" : "max-w-[370px]"}`}
      style={{ containerType: "inline-size" }}
    >
      <div
        className={`relative isolate flex-1 overflow-hidden ${rootClass}`}
        style={{ minHeight: seasonalTheme ? "190cqw" : fitContainer ? "min(844px, 212cqw)" : "min(100svh, 212cqw)" }}
      >
        <div className={`relative z-10 shrink-0 ${headingAlignmentClass}`}>
          {logoMode !== "none" ? (
            <div className={`flex ${logoAlignmentClass}`} style={{ marginBottom: `${Math.max(0, logoBottomSpacingPx)}px` }}>
              {issue724ScratchStyle && logoMode === "text" ? (
                <div
                  data-testid={isRetroScratch ? "retro-scratch-logo-badge" : "issue724-scratch-logo-badge"}
                  className="flex h-[clamp(64px,19cqw,88px)] w-[clamp(64px,19cqw,88px)] shrink-0 items-center justify-center rounded-full border px-2 text-center shadow-[0_3px_10px_rgba(89,53,29,.15)]"
                  style={{ backgroundColor: issue724ScratchStyle.badge, borderColor: issue724ScratchStyle.badgeBorder }}
                >
                  <span className="font-display text-[clamp(9px,3.2cqw,14px)] font-semibold leading-tight" style={{ color: issue724ScratchStyle.logoColor }}>
                    {logoText || "Votre commerce"}
                  </span>
                </div>
              ) : (
                <BrandMark
                  logoText={logoText || "Votre commerce"}
                  logoUrl={logoMode === "image" ? logoUrl : undefined}
                  size="lg"
                  variant="transparent"
                  imageWidthPx={logoWidthPx}
                  textSizePx={logoTextSizePx}
                  textClassName="text-2xl"
                  textColor={halloweenTheme?.logo || logoTextColor || ink}
                />
              )}
            </div>
          ) : null}
          <h2
            className={`${(beautyTheme && !christmasTheme && !halloweenTheme) || isConfetti || isRetroScratch ? "mx-auto max-w-[11ch]" : ""} text-2xl leading-[1.04] ${resolvedHeadingFontClass}`}
            style={{ color: ink, fontSize: seasonalTheme ? `${(headingFontSizePx ?? 46) / 3.9}cqw` : headingFontSize, fontWeight: isRetroScratch ? Math.max(700, headingFontWeight) : headingFontWeight, letterSpacing: isRetroScratch ? "-0.025em" : undefined, whiteSpace: seasonalTheme ? "pre-line" : undefined,
              ...(halloweenTheme ? { backgroundImage: "linear-gradient(175deg,#fff0c7 0%,#f4b351 40%,#bc7024 70%,#ffdc94 100%)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 6px #d982213d)" } : {}) }}
          >
            {displayHeadline}
          </h2>
          {halloweenTheme ? <Image src="/images/templates/halloween-gold/wordmark-v3.webp" alt="Spécial Halloween" width={900} height={196} className="mx-auto mt-4 h-auto w-[82%]" /> : null}
          {secondaryText?.trim() ? (
            <p
              className={`mx-auto ${isRetroScratch ? "max-w-[280px] normal-case leading-[1.2] tracking-normal" : christmasTheme ? "max-w-[92%] normal-case leading-[1.2] tracking-normal" : "max-w-[280px] uppercase leading-[1.55] tracking-[0.08em]"} ${headingAlignmentClass}`}
              style={{ color: withAlpha(isLilac ? logoTextColor || ink : ink, "d9"), fontSize: christmasTheme ? "clamp(12px, 6cqw, 18px)" : "clamp(10px, 4cqw, 14px)", marginTop: `${Math.max(0, subtitleSpacingPx)}px` }}
            >
              {secondaryText.trim()}
            </p>
          ) : null}
        </div>

        <div
          className={`relative z-10 flex flex-1 ${isIssue724IllustratedScratch ? "items-start" : "items-center"} ${scratchShape ? "justify-start" : "justify-center"}`}
          style={{ paddingTop: `${Math.max(0, textToScratchSpacingPx)}px`, paddingBottom: fitContainer ? "16cqw" : "clamp(32px, 8svh, 72px)" }}
        >
        <div
          data-testid="scratch-ticket-surface"
          data-scratch-shape={scratchShape ?? "default"}
          className={`relative shrink-0 overflow-hidden ${surfaceClass} ${beautyTheme ? `${surfaceRimClass} shadow-[0_14px_34px_rgba(55,42,30,.18)]` : "rounded-[26px] shadow-[0_18px_40px_rgba(55,42,30,.16)]"}`}
          style={{
            ...(scratchClipPath ? { clipPath: scratchClipPath } : {}),
            ...(issue724ScratchStyle?.scratchRotationDeg ? { transform: `rotate(${issue724ScratchStyle.scratchRotationDeg}deg)`, transformOrigin: "center" } : {}),
            ...(issue724ScratchStyle && !isRetroScratch ? { backgroundColor: issue724ScratchStyle.revealBackground } : {}),
          }}
        >
          {issue724ScratchStyle ? (
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute ${isDecorativeTicket ? "inset-[16px]" : "inset-0"} z-0`}
              data-testid="scratch-result-backdrop"
              style={{
                backgroundColor: issue724ScratchStyle.revealBackground,
                clipPath: scratchClipPath,
              }}
            />
          ) : null}
          {isDecorativeTicket ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 text-[#ffe18a]">
            <span className="absolute left-[8%] top-[12%] text-[clamp(12px,4cqw,19px)]">★</span>
            <span className="absolute right-[8%] top-[12%] text-[clamp(12px,4cqw,19px)]">★</span>
            <span className="absolute bottom-[12%] left-[8%] text-[clamp(12px,4cqw,19px)]">★</span>
            <span className="absolute bottom-[12%] right-[8%] text-[clamp(12px,4cqw,19px)]">★</span>
          </div> : null}
          {!hasTouched && !revealed ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
              data-testid="scratch-foil-first-paint"
              style={{
                position: "absolute",
                inset: isDecorativeTicket ? "16px" : 0,
                clipPath: scratchClipPath,
                backgroundColor: coverColor,
                ...(christmasTheme ? {
                  backgroundImage: isRetroScratch
                    ? `repeating-linear-gradient(0deg, transparent 0 5px, rgba(255,255,255,.52) 6px, transparent 7px), repeating-linear-gradient(135deg, transparent 0 11px, rgba(158,112,73,.09) 12px, transparent 13px), linear-gradient(115deg, #f1e3c6 0%, #fff8e8 22%, #faf0d9 48%, #edddbd 67%, #fffaf0 80%, #f1e3c6 100%)`
                    : `linear-gradient(135deg, ${coverColor} 0%, ${coverHighlight} 46%, ${coverColor} 100%)`,
                } : beautyTheme ? {} : {
                  backgroundImage: `repeating-linear-gradient(135deg, transparent 0 32px, ${withAlpha(readableTextColor(primary), isSunburst ? "24" : "2e")} 33px 35px), linear-gradient(135deg, ${coverColor} 0%, ${coverHighlight} 42%, ${coverColor} 72%, ${blendWithWhite(coverColor, isSunburst ? 0.04 : 0.08)} 100%)`,
                }),
                ...(beautyTheme && !christmasTheme && !beautyTheme.scratch.texture ? { backgroundImage: `repeating-linear-gradient(135deg, transparent 0 22px, rgba(255,255,255,.2) 23px 24px), linear-gradient(135deg, ${coverColor}, ${coverHighlight} 48%, ${coverColor})` } : {}),
              }}
            >
              {scratchFinish?.texture && !christmasTheme ? (
                <Image
                  src={scratchFinish.texture}
                  alt=""
                  fill
                  sizes="216px"
                  unoptimized
                  loading="eager"
                  className="object-cover"
                  style={{ opacity: scratchFinish.textureOpacity }}
                />
              ) : null}
            </div>
          ) : null}
          {!revealed && !hasTouched ? (
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute ${isDecorativeTicket ? "inset-[16px]" : "inset-0"} z-30 flex items-center justify-center ${isSunburst ? "p-6" : "p-5"}`}
            >
              {isVault ? <VaultIllustration color={illustrationColor} /> : null}
              {!isVault && isLilac ? <GiftIllustration color={illustrationColor} /> : null}
              {!beautyTheme && !isVault && !isLilac && !isCoral && !isSunburst ? <GiftIllustration color={illustrationColor} /> : null}
              {isSunburst ? <ScratchMark color={illustrationColor} /> : null}
            </div>
          ) : null}
          {hasTouched ? (
            <div className={`pointer-events-none absolute ${isDecorativeTicket ? "inset-[16px]" : "inset-0"} z-10 flex items-center justify-center px-6 text-center`}>
              <p
                data-testid="scratch-result-label"
                className="max-w-[90%] font-semibold leading-[1.05]"
                style={{
                  color: issue724ScratchStyle?.revealText ?? resultInk,
                  fontSize: "clamp(2rem, 8vw, 3rem)",
                  textShadow: resultTextShadow,
                }}
              >
                {resultLabel}
              </p>
            </div>
          ) : null}
          {!revealed ? (
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              data-foil-texture={beautyTheme?.id}
              data-foil-loaded={beautyTheme ? "false" : undefined}
              data-scratch-shape={scratchShape ?? "default"}
              aria-label={instruction}
              className="relative z-20 block h-full w-full touch-none cursor-crosshair"
              style={scratchClipPath ? { clipPath: scratchClipPath } : undefined}
              onPointerDown={(event) => {
                if (!enabled) {
                  onStart?.();
                  return;
                }
                setHasTouched(true);
                if (!scratchStartedRef.current) {
                  scratchStartedRef.current = true;
                  onScratchStart?.();
                }
                event.currentTarget.setPointerCapture(event.pointerId);
                drawingRef.current = true;
                scratch(...Object.values(pointFromEvent(event)) as [number, number]);
              }}
              onPointerMove={(event) => {
                if (!drawingRef.current || !enabled) return;
                scratch(...Object.values(pointFromEvent(event)) as [number, number]);
              }}
              onPointerUp={() => {
                drawingRef.current = false;
                checkReveal();
              }}
              onPointerCancel={() => {
                drawingRef.current = false;
              }}
            />
          ) : (
            <div className="relative z-30 flex h-full w-full items-center justify-center bg-white/90 p-6 text-center backdrop-blur-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
                  Votre gain
                </p>
                <p className="mt-3 text-2xl font-semibold" style={{ color: resultInk }}>
                  {resultLabel}
                </p>
              </div>
            </div>
          )}
          {isDecorativeTicket ? (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 text-[#f8db85]">
              <Sparkles className="absolute left-[2%] top-[2%] h-[11px] w-[11px]" />
              <Sparkles className="absolute right-[2%] top-[2%] h-[11px] w-[11px]" />
              <Sparkles className="absolute bottom-[2%] left-[2%] h-[11px] w-[11px]" />
              <Sparkles className="absolute bottom-[2%] right-[2%] h-[11px] w-[11px]" />
            </div>
          ) : null}
        </div>
        </div>
      </div>
    </div>
  );
}
