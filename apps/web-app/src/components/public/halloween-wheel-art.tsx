"use client";

import Image from "next/image";
import { useId, type ReactNode } from "react";
import type { LogoMode, TextAlign } from "@/lib/types";
import type { WheelVisualSegment } from "@/lib/wheel-segments";
import {
  HALLOWEEN_WHEEL_BACKGROUND,
  HALLOWEEN_WHEEL_FRAME,
} from "@/lib/halloween-wheel-theme";
import styles from "./halloween-wheel.module.css";

const unit = (px: number) => `${px / 3.9}cqw`;

export function HalloweenWheelScene({
  logoMode = "text",
  logoText,
  logoUrl,
  logoWidthPx = 180,
  logoTextSizePx = 24,
  logoTextColor = "#f8f6ef",
  logoAlign = "center",
  logoBottomSpacingPx = 5,
  title,
  titleAlign = "center",
  titleFontSizePx = 40,
  titleFontFamily = "var(--font-bodoni),Georgia,serif",
  titleFontWeight = 500,
  secondaryText = "",
  subtitleSpacingPx = 15,
  blockSpacingPx = 32,
  children,
}: {
  logoMode?: LogoMode;
  logoText: string;
  logoUrl?: string;
  logoWidthPx?: number;
  logoTextSizePx?: number;
  logoTextColor?: string;
  logoAlign?: TextAlign;
  logoBottomSpacingPx?: number;
  title: string;
  titleAlign?: TextAlign;
  titleFontSizePx?: number;
  titleFontFamily?: string;
  titleFontWeight?: number;
  secondaryText?: string;
  subtitleSpacingPx?: number;
  blockSpacingPx?: number;
  children: ReactNode;
}) {
  return (
    <section className={styles.scene} data-testid="halloween-wheel-scene">
      <Image
        src={HALLOWEEN_WHEEL_BACKGROUND}
        alt=""
        fill
        sizes="(max-width: 600px) 100vw, 600px"
        loading="eager"
        className={styles.background}
      />
      <div className={styles.content}>
        {logoMode !== "none" ? (
          <header
            className={styles.brand}
            style={{ marginBottom: unit(logoBottomSpacingPx) }}
          >
            {logoMode === "image" && logoUrl ? (
              <Image
                src={logoUrl}
                alt={logoText}
                width={720}
                height={240}
                unoptimized
                className={styles.logoImage}
                style={{
                  width: unit(logoWidthPx),
                  marginLeft: logoAlign === "left" ? 0 : "auto",
                  marginRight: logoAlign === "right" ? 0 : "auto",
                }}
              />
            ) : logoMode === "text" ? (
              <p
                className={styles.logoText}
                style={{
                  fontSize: unit(logoTextSizePx * 0.62),
                  color: logoTextColor,
                  textAlign: logoAlign,
                }}
              >
                {logoText}
              </p>
            ) : null}
            <div className={styles.brandRule} aria-hidden="true">
              <span />♥<span />
            </div>
          </header>
        ) : null}
        <h1
          className={styles.title}
          style={{
            fontSize: unit(titleFontSizePx),
            fontFamily: titleFontFamily,
            fontWeight: titleFontWeight,
            textAlign: titleAlign,
          }}
        >
          {title}
        </h1>
        {secondaryText.trim() ? (
          <p
            className={styles.secondary}
            style={{ marginTop: unit(subtitleSpacingPx), color: logoTextColor }}
          >
            {secondaryText}
          </p>
        ) : null}
        <p className={styles.halloween}>
          <Image
            src="/images/templates/halloween-gold/wordmark-v3.webp"
            alt="Spécial Halloween"
            width={900}
            height={196}
            sizes="(max-width: 600px) 79vw, 474px"
            className={styles.wordmark}
          />
        </p>
        <div
          className={styles.wheelSlot}
          style={{ marginTop: unit(Math.max(24, blockSpacingPx)) }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

export function HalloweenWheelVisual({
  segments,
  rotation = 0,
  spinning = false,
  disabled = false,
  buttonLabel = "JOUER",
  interactive = true,
  onClick,
}: {
  segments: WheelVisualSegment[];
  rotation?: number;
  spinning?: boolean;
  disabled?: boolean;
  buttonLabel?: string;
  interactive?: boolean;
  onClick?: () => void;
}) {
  const uid = useId().replaceAll(":", "");
  const gold = `${uid}-gold`,
    black = `${uid}-black`;
  const angle = 360 / Math.max(1, segments.length);
  // Stable SVG coordinates prevent Node/Chromium floating-point hydration differences.
  const point = (r: number, degrees: number) =>
    [
      320 + r * Math.sin((degrees * Math.PI) / 180),
      320 - r * Math.cos((degrees * Math.PI) / 180),
    ].map((value) => Math.round(value * 1000) / 1000);
  const icons = ["gift", "mask", "pumpkin", "sparkles", "heart", "gem"];
  return (
    <div
      className={styles.wheel}
      data-testid="halloween-wheel"
      data-segment-count={segments.length}
    >
      <div
        className={styles.rotor}
        style={{ transform: `rotate(${rotation}deg)` }}
        data-testid="halloween-wheel-rotor"
      >
        <svg viewBox="0 0 640 640" className={styles.disc} aria-hidden="true">
          <defs>
            <radialGradient id={gold} cx=".5" cy=".47" r=".65">
              <stop stopColor="#ffdb88" />
              <stop offset=".28" stopColor="#ffc56b" />
              <stop offset=".7" stopColor="#ed9b37" />
              <stop offset="1" stopColor="#a9551b" />
            </radialGradient>
            <pattern
              id={`${uid}-foil`}
              width="640"
              height="640"
              patternUnits="userSpaceOnUse"
            >
              <image
                href="/images/templates/halloween-gold/foil.webp"
                width="640"
                height="640"
              />
            </pattern>
            <radialGradient id={black} cx=".3" cy=".25" r=".9">
              <stop stopColor="#352f26" />
              <stop offset=".6" stopColor="#15110d" />
              <stop offset="1" stopColor="#020201" />
            </radialGradient>
          </defs>
          {segments.map((segment, index) => {
            const start = point(303, index * angle),
              end = point(303, (index + 1) * angle);
            const center = point(205, (index + 0.5) * angle);
            const light = index % 2 === 0;
            return (
              <g key={`${segment.id}-${index}`} data-segment-id={segment.id}>
                <title>{segment.label}</title>
                <path
                  d={`M320 320 L${start.join(" ")} A303 303 0 ${angle > 180 ? 1 : 0} 1 ${end.join(" ")} Z`}
                  fill={`url(#${light ? gold : black})`}
                  stroke="#f7c46e"
                  strokeWidth="1.25"
                />
                {light ? (
                  <path
                    d={`M320 320 L${start.join(" ")} A303 303 0 ${angle > 180 ? 1 : 0} 1 ${end.join(" ")} Z`}
                    fill={`url(#${uid}-foil)`}
                    opacity=".12"
                  />
                ) : null}
                <image
                  href={`/images/templates/halloween-gold/${icons[index % icons.length]}.webp`}
                  x={center[0] - (index % 6 === 1 ? 61 : 47)}
                  y={center[1] - 47}
                  width={index % 6 === 1 ? 122 : 94}
                  height="94"
                  preserveAspectRatio="xMidYMid meet"
                />
              </g>
            );
          })}
        </svg>
      </div>
      <Image
        src={HALLOWEEN_WHEEL_FRAME}
        alt=""
        width={1254}
        height={1254}
        sizes="(max-width: 600px) 100vw, 540px"
        className={styles.frame}
      />
      <svg viewBox="0 0 86 100" className={styles.pointer} aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}-pointer`}>
            <stop stopColor="#a65212" />
            <stop offset=".3" stopColor="#ffb856" />
            <stop offset=".5" stopColor="#fff3c4" />
            <stop offset=".7" stopColor="#ea9228" />
            <stop offset="1" stopColor="#74320b" />
          </linearGradient>
        </defs>
        <path
          d="M6 6Q43-1 80 6Q83 7 80 14L48 91Q43 102 38 91L6 14Q3 8 6 6Z"
          fill={`url(#${uid}-pointer)`}
          stroke="#ffc579"
          strokeWidth="2"
        />
        <path d="M10 10 43 25 76 10 43 91Z" fill="#fff0b5" />
        <path d="M43 25 43 91 10 10Z" fill="#ef962e" />
        <path d="M43 25 76 10 43 91Z" fill="#ffbb5b" />
        <path
          d="M10 10 43 25 43 91"
          fill="none"
          stroke="#fff6d1"
          strokeWidth="1.7"
        />
      </svg>
      {interactive ? (
        <button
          type="button"
          className={styles.play}
          aria-label={spinning ? "La roue tourne" : "Jouer à la roue"}
          disabled={disabled}
          onClick={onClick}
        >
          {spinning ? "..." : buttonLabel}
        </button>
      ) : (
        <span className={styles.play}>{buttonLabel}</span>
      )}
      <ul className="sr-only" aria-label="Segments de la roue">
        {segments.map((segment, index) => (
          <li key={`${segment.id}-${index}`}>{segment.label}</li>
        ))}
      </ul>
    </div>
  );
}
