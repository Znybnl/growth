"use client";

import Image from "next/image";
import { useId, type ReactNode } from "react";
import { FittedWheelLabel } from "./fitted-wheel-label";
import { legibleSegmentTextColor } from "@/lib/color-contrast";
import { textFontFamily } from "@/lib/format";
import { christmasWheelDefaultBackground, christmasWheelSegmentColors, christmasWheelTheme, type ChristmasWheelTemplateId } from "@/lib/christmas-wheel-themes";
import type { CampaignWheelSettings, LogoMode, TextAlign } from "@/lib/types";
import type { WheelVisualSegment } from "@/lib/wheel-segments";
import styles from "./christmas-wheel.module.css";

const unit = (px: number) => `${px / 3.9}cqw`;

export function ChristmasWheelScene({ templateId, background, logoMode = "text", logoText, logoUrl,
  logoWidthPx, logoTextSizePx, logoTextColor, logoAlign, logoBottomSpacingPx, title,
  titleColor, titleFontSizePx, titleFontFamily, titleFontWeight, titleAlign, secondaryText,
  subtitleSpacingPx, blockSpacingPx, publicPage = false, children }: {
  templateId: ChristmasWheelTemplateId; background: { color: string; imageUrl?: string };
  logoMode?: LogoMode; logoText: string; logoUrl?: string; logoWidthPx: number; logoTextSizePx: number;
  logoTextColor: string; logoAlign: TextAlign; logoBottomSpacingPx: number;
  title: string; titleColor: string; titleFontSizePx: number; titleFontFamily: string;
  titleFontWeight: number; titleAlign: TextAlign; secondaryText: string;
  subtitleSpacingPx: number; blockSpacingPx: number; publicPage?: boolean; children: ReactNode;
}) {
  const artwork = background.imageUrl || christmasWheelDefaultBackground(templateId, background);
  return <section className={`${styles.scene} ${publicPage ? styles.public : ""}`} data-testid="christmas-wheel-scene" style={{ position: "relative", backgroundColor: background.color, color: logoTextColor }}>
    {artwork ? <Image src={artwork} alt="" fill sizes="(max-width: 600px) 100vw, 600px" loading="eager" className={styles.art} data-template-art={background.imageUrl ? undefined : templateId} unoptimized={Boolean(background.imageUrl)} /> : null}
    <div className={styles.content}>
      {logoMode !== "none" ? <header className={styles.brand} style={{ marginBottom: unit(logoBottomSpacingPx), textAlign: logoAlign }}>
        {logoMode === "image" && logoUrl ? <Image src={logoUrl} alt={logoText} width={720} height={240} unoptimized className={styles.brandImage} style={{ width: unit(logoWidthPx), marginLeft: logoAlign === "left" ? 0 : "auto", marginRight: logoAlign === "right" ? 0 : "auto" }} />
          : logoMode === "text" ? <><p className={styles.brandText} style={{ fontSize: unit(logoTextSizePx) }}>{logoText}</p><span className={styles.rule} aria-hidden="true" /></> : null}
      </header> : null}
      <h1 className={`${styles.title} ${templateId === "christmas-traditional" ? styles.goldTitle : ""}`} style={{ color: titleColor, fontSize: unit(titleFontSizePx), fontFamily: titleFontFamily, fontWeight: titleFontWeight, textAlign: titleAlign }}>{title}</h1>
      {secondaryText.trim() ? <p className={styles.subtitle} data-testid="christmas-wheel-subtitle" style={{ marginTop: unit(subtitleSpacingPx) }}>{secondaryText}</p> : null}
      <div className={styles.wheelSlot} style={{ marginTop: unit(Math.max(24, blockSpacingPx)) }}>{children}</div>
    </div>
  </section>;
}

function labelLines(label: string) {
  // Balance the complete label over up to three lines; long labels shrink individually.
  const words = label.toLocaleUpperCase("fr").trim().split(/\s+/);
  const lines = [""];
  const target = Math.max(10, Math.ceil(label.length / 3));
  for (const word of words) {
    const last = lines.length - 1;
    if (lines[last] && lines[last].length + word.length + 1 > target && lines.length < 3) lines.push(word);
    else lines[last] += `${lines[last] ? " " : ""}${word}`;
  }
  return lines;
}

export function ChristmasWheelVisual({ templateId, segments, palette, rotation = 0, spinning = false,
  disabled = false, interactive = true, buttonLabel = "JOUER", buttonBackground, buttonTextColor, onClick }: {
  templateId: ChristmasWheelTemplateId; segments: WheelVisualSegment[]; palette?: CampaignWheelSettings;
  rotation?: number; spinning?: boolean; disabled?: boolean; interactive?: boolean;
  buttonLabel?: string; buttonBackground?: string; buttonTextColor?: string; onClick?: () => void;
}) {
  const id = `christmas-${useId().replace(/:/g, "")}`;
  const theme = christmasWheelTheme(templateId)!;
  const colors = christmasWheelSegmentColors(templateId, segments.length, palette ?? { loseColor: theme.primary, alternateLoseColor: theme.secondary, winColor: theme.third });
  const rim = palette?.rimColor ?? theme.rim;
  const angle = 360 / Math.max(1, segments.length);
  // Stable SVG strings across Node/V8 and browsers (Math trig may differ at 1e-14).
  const point = (degrees: number, radius: number) => ({
    x: Number((320 + Math.cos(degrees * Math.PI / 180) * radius).toFixed(4)),
    y: Number((320 + Math.sin(degrees * Math.PI / 180) * radius).toFixed(4)),
  });
  const buttonColor = buttonBackground ?? theme.button;
  const buttonInk = legibleSegmentTextColor(buttonColor, buttonTextColor ?? "#fff8e8");
  return <div className={styles.wheel} data-testid="christmas-wheel">
    <div className={styles.rotor} data-testid="christmas-wheel-rotor" style={{ transform: `rotate(${rotation}deg)` }}>
      <svg viewBox="0 0 640 640" role="img" aria-label="Lots de la roue">
        <defs>
          {colors.map((color, index) => <radialGradient key={index} id={`${id}-sector-${index}`} cx="35%" cy="24%" r="85%"><stop stopColor={color} /><stop offset=".6" stopColor={color} /><stop offset="1" stopColor={color} stopOpacity=".88" /></radialGradient>)}
          <radialGradient id={`${id}-shine`} cx="32%" cy="24%" r="90%"><stop stopColor="white" stopOpacity=".2" /><stop offset=".5" stopColor="white" stopOpacity="0" /><stop offset="1" stopColor="#5e3717" stopOpacity=".1" /></radialGradient>
        </defs>
        {segments.map((segment, index) => {
          const start = point(index * angle - 90, 300), end = point((index + 1) * angle - 90, 300);
          const mid = index * angle + angle / 2 - 90;
          const location = point(mid, 204);
          const lines = labelLines(segment.label);
          const size = lines.length === 3 ? 25 : 29;
          const upright = mid > 90 || mid < -90 ? mid + 180 : mid;
          return <g key={segment.id} data-segment-id={segment.id}>
            <path d={`M320 320 L${start.x} ${start.y} A300 300 0 ${angle > 180 ? 1 : 0} 1 ${end.x} ${end.y} Z`} fill={`url(#${id}-sector-${index})`} stroke="#d9bb87" strokeWidth="1.4" />
            <FittedWheelLabel lines={lines} baseFontSize={size} lineHeight={size * .98} initialOffset={-(lines.length - 1) * size * .49}
              radius={204} buttonRadius={104} outerRadius={300} sectorAngle={angle}
              x={location.x} y={location.y} fill={legibleSegmentTextColor(colors[index], theme.logo)}
              fontFamily={textFontFamily("dm-sans")} fontWeight="650" textAnchor="middle" dominantBaseline="middle"
              transform={`rotate(${upright} ${location.x} ${location.y})`} />
          </g>;
        })}
        <circle cx="320" cy="320" r="300" fill={`url(#${id}-shine)`} pointerEvents="none" />
      </svg>
    </div>
    <svg viewBox="0 0 640 640" className={styles.rim} data-testid="christmas-wheel-rim" aria-hidden="true">
      <defs><linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff1bf" /><stop offset=".22" stopColor={rim} /><stop offset=".42" stopColor="#fff4c4" /><stop offset=".65" stopColor={rim} /><stop offset=".86" stopColor="#fce6a6" /><stop offset="1" stopColor="#80602a" /></linearGradient></defs>
      <circle cx="320" cy="320" r="308.5" fill="none" stroke="#fffae7" strokeWidth="2" />
      <circle cx="320" cy="320" r="304" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="7" />
      <circle cx="320" cy="320" r="300" fill="none" stroke="#fff1cd" strokeWidth="1.5" />
    </svg>
    <svg viewBox="0 0 64 96" className={styles.pointer} data-testid="christmas-wheel-pointer" aria-hidden="true">
      <path d="M6 15C6-2 58-2 58 15C58 36 40 68 32 88C24 68 6 36 6 15Z" fill={`url(#${id}-gold)`} stroke="#ffecc0" strokeWidth="2.4" />
      <path d="M32 5L32 76C23 53 12 29 12 16C12 10 19 6 32 5Z" fill="white" opacity=".24" />
    </svg>
    {interactive ? <button type="button" className={styles.button} aria-label="Jouer à la roue" aria-busy={spinning} disabled={disabled} onClick={onClick} style={{ background: `radial-gradient(ellipse at 30% 18%, color-mix(in srgb, ${buttonColor} 60%, #ffe5a1), ${buttonColor} 70%)`, color: buttonInk }}>{buttonLabel}</button>
      : <span className={styles.button} style={{ background: buttonColor, color: buttonInk }}>JOUER</span>}
  </div>;
}
