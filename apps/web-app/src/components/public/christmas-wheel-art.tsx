"use client";

import Image from "next/image";
import { useId, type CSSProperties, type ReactNode } from "react";
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
  const gildedTitle = templateId === "christmas-traditional" && titleColor.toLowerCase() === christmasWheelTheme(templateId)!.text;
  return <section className={`${styles.scene} ${publicPage ? styles.public : ""}`} data-testid="christmas-wheel-scene" style={{ position: "relative", backgroundColor: background.color, color: logoTextColor }}>
    {artwork ? <Image src={artwork} alt="" fill sizes="(max-width: 600px) 100vw, 600px" loading="eager" className={styles.art} data-template-art={background.imageUrl ? undefined : templateId} unoptimized={Boolean(background.imageUrl)} /> : null}
    <div className={styles.content}>
      {logoMode !== "none" ? <header className={styles.brand} style={{ marginBottom: unit(logoBottomSpacingPx), textAlign: logoAlign }}>
        {logoMode === "image" && logoUrl ? <Image src={logoUrl} alt={logoText} width={720} height={240} unoptimized className={styles.brandImage} style={{ width: unit(logoWidthPx), marginLeft: logoAlign === "left" ? 0 : "auto", marginRight: logoAlign === "right" ? 0 : "auto" }} />
          : logoMode === "text" ? <><p className={styles.brandText} style={{ fontSize: unit(logoTextSizePx) }}>{logoText}</p><span className={styles.rule} style={{ marginLeft: logoAlign === "left" ? 0 : "auto", marginRight: logoAlign === "right" ? 0 : "auto" }} aria-hidden="true" /></> : null}
      </header> : null}
      <h1 className={`${styles.title} ${gildedTitle ? styles.goldTitle : ""}`} style={{ color: titleColor, fontSize: unit(titleFontSizePx), fontFamily: titleFontFamily, fontWeight: titleFontWeight, textAlign: titleAlign }}>{title}</h1>
      {secondaryText.trim() ? <p className={styles.subtitle} data-testid="christmas-wheel-subtitle" style={{ marginTop: unit(subtitleSpacingPx) }}>{secondaryText}</p> : null}
      <div className={styles.wheelSlot} style={{ marginTop: unit(Math.max(24, blockSpacingPx)) }}>
        {blockSpacingPx >= 40 ? <div className={styles.festiveRule} aria-hidden="true"><span /><svg viewBox="0 0 16 16"><path d="m8 0 2 5 6 3-6 2-2 6-2-6-6-2 6-3Z" fill="currentColor" /></svg><span /></div> : null}
        {children}
      </div>
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
  const centerStyle = { "--christmas-button-color": buttonColor, "--christmas-rim-color": rim, color: buttonInk } as CSSProperties;
  return <div className={styles.wheel} data-testid="christmas-wheel">
    <div className={styles.rotor} data-testid="christmas-wheel-rotor" style={{ transform: `rotate(${rotation}deg)`, willChange: spinning ? "transform" : undefined }}>
      <svg viewBox="0 0 640 640" role="img" aria-label="Lots de la roue">
        <defs>
          {colors.map((color, index) => <radialGradient key={index} id={`${id}-sector-${index}`} cx="36%" cy="25%" r="85%"><stop stopColor={color} /><stop offset="1" stopColor={color} /></radialGradient>)}
          <radialGradient id={`${id}-shine`} cx="27%" cy="18%" r="100%"><stop stopColor="white" stopOpacity=".32" /><stop offset=".42" stopColor="white" stopOpacity="0" /><stop offset=".78" stopColor="#3e2108" stopOpacity=".035" /><stop offset="1" stopColor="#3e2108" stopOpacity=".18" /></radialGradient>
          <pattern id={`${id}-brushed`} width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 .5H6" stroke="white" strokeOpacity=".16" strokeWidth=".6" /><path d="M0 3.5H6" stroke="#4b321a" strokeOpacity=".08" strokeWidth=".4" /></pattern>
          <radialGradient id={`${id}-inset`}><stop offset=".91" stopColor="#40290d" stopOpacity="0" /><stop offset="1" stopColor="#40290d" stopOpacity=".17" /></radialGradient>
        </defs>
        {segments.map((segment, index) => {
          const start = point(index * angle - 90, 300), end = point((index + 1) * angle - 90, 300);
          const mid = index * angle + angle / 2 - 90;
          const location = point(mid, 204);
          const lines = labelLines(segment.label);
          const size = lines.length === 3 ? 25 : 29;
          const upright = mid > 90 || mid < -90 ? mid + 180 : mid;
          return <g key={segment.id} data-segment-id={segment.id}>
            <path d={`M320 320 L${start.x} ${start.y} A300 300 0 ${angle > 180 ? 1 : 0} 1 ${end.x} ${end.y} Z`} fill={`url(#${id}-sector-${index})`} stroke="#f4dfba" strokeWidth="1.8" />
            <FittedWheelLabel lines={lines} baseFontSize={size} lineHeight={size * .98} initialOffset={-(lines.length - 1) * size * .49}
              radius={204} buttonRadius={112} outerRadius={300} sectorAngle={angle}
              x={location.x} y={location.y} fill={legibleSegmentTextColor(colors[index], theme.logo)}
              fontFamily={textFontFamily("dm-sans")} fontWeight="650" textAnchor="middle" dominantBaseline="middle"
              transform={`rotate(${upright} ${location.x} ${location.y})`} />
          </g>;
        })}
        <circle cx="320" cy="320" r="300" fill={`url(#${id}-shine)`} pointerEvents="none" />
        <circle cx="320" cy="320" r="300" fill={`url(#${id}-brushed)`} opacity=".38" pointerEvents="none" />
        <circle cx="320" cy="320" r="300" fill={`url(#${id}-inset)`} pointerEvents="none" />
      </svg>
    </div>
    <svg viewBox="0 0 640 640" className={styles.rim} data-testid="christmas-wheel-rim" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff9d8" /><stop offset=".12" stopColor={rim} /><stop offset=".24" stopColor="#fff2c1" /><stop offset=".38" stopColor={rim} /><stop offset=".52" stopColor="#fff4c9" /><stop offset=".72" stopColor={rim} /><stop offset=".88" stopColor="#fce7b0" /><stop offset="1" stopColor="#725125" /></linearGradient>
        <linearGradient id={`${id}-pointer`}><stop stopColor="#79511f" /><stop offset=".21" stopColor={rim} /><stop offset=".48" stopColor="#fff2be" /><stop offset=".56" stopColor="#e6c078" /><stop offset="1" stopColor={rim} /></linearGradient>
      </defs>
      <circle cx="320" cy="320" r="311" fill="none" stroke="#fff9e5" strokeWidth="2.4" />
      <circle cx="320" cy="320" r="307" fill="none" stroke="#8b632f" strokeWidth="5" />
      <circle cx="320" cy="320" r="305" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="10" />
      <circle cx="320" cy="320" r="299" fill="none" stroke="#fff2ce" strokeWidth="2" />
      <circle cx="320" cy="320" r="296.5" fill="none" stroke="#805726" strokeOpacity=".44" strokeWidth="1.2" />
      <path d="M77 133A307 307 0 0 1 243 23" fill="none" stroke="#fff9e4" strokeWidth="1.7" strokeLinecap="round" opacity=".9" />
      <circle cx="320" cy="320" r="111" fill={`url(#${id}-gold)`} stroke="#7a5124" strokeWidth="1" />
      <circle cx="320" cy="320" r="104.5" fill="#5b391b" />
    </svg>
    <svg viewBox="0 0 64 96" className={styles.pointer} data-testid="christmas-wheel-pointer" aria-hidden="true">
      <path d="M6 15C6-2 58-2 58 15C58 36 40 68 32 88C24 68 6 36 6 15Z" fill={`url(#${id}-pointer)`} stroke="#ffecc0" strokeWidth="2.4" />
      <path d="M32 5L32 76C23 53 12 29 12 16C12 10 19 6 32 5Z" fill="#fff8d6" opacity=".3" />
      <path d="M12 17C12 7 23 5 32 5" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" opacity=".85" />
    </svg>
    {interactive ? <button type="button" className={styles.button} aria-label="Jouer à la roue" aria-busy={spinning} disabled={disabled} onClick={onClick} style={centerStyle}>{buttonLabel}</button>
      : <span className={styles.button} style={centerStyle}>JOUER</span>}
  </div>;
}
