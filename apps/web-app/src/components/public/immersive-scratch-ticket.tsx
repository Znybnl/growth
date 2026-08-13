"use client";

import { useEffect, useRef, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import {
  DEFAULT_SCRATCH_LILAC_COLOR,
  DEFAULT_SCRATCH_PRIMARY_COLOR,
  DEFAULT_SCRATCH_SUBTITLE,
  scratchTemplatePrimaryColor,
} from "@/lib/campaign-defaults";

type ScratchTemplateId =
  | "scratch-vault"
  | "scratch-confetti"
  | "scratch-coral"
  | "scratch-lilac"
  | "scratch-sunburst";

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
  headingTextColor?: string;
  headingFontClass?: string;
  headingFontSize?: string;
  headingFontWeight?: number;
  headingAlignmentClass?: string;
  logoAlignmentClass?: string;
  logoBottomSpacingPx?: number;
  logoWidthPx?: number;
  logoTextSizePx?: number;
  /** Let editor previews use the full phone frame width while keeping the public game constrained. */
  fitContainer?: boolean;
};

const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 430;

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
  headingTextColor,
  headingFontClass,
  headingFontWeight = 600,
  headingAlignmentClass = "text-center",
  logoAlignmentClass = "justify-center",
  logoBottomSpacingPx = 32,
  logoWidthPx = 170,
  logoTextSizePx = 30,
  fitContainer = false,
  headingFontSize = "32px",
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
  const configuredPrimary = accent.signal;
  const primary = scratchTemplatePrimaryColor(configuredPrimary, template);
  const hasCustomPrimary =
    configuredPrimary.trim().toLowerCase() !== DEFAULT_SCRATCH_PRIMARY_COLOR &&
    !isConfe