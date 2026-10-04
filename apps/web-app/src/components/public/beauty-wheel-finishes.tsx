"use client";

import { useId, type CSSProperties } from "react";

/** Decorative only: no interaction, segment selection or animation state. */
export function BeautyWheelRim({ color, width, fill }: { color: string; width: number; fill: string }) {
  return <g data-testid="beauty-wheel-rim">
    <circle cx="320" cy="320" r="317" fill={fill} stroke="#ffffff" strokeWidth={width + 4} vectorEffect="non-scaling-stroke" />
    <circle data-testid="beauty-wheel-colored-rim" cx="320" cy="320" r="317" fill="none" stroke={color} strokeWidth={width} vectorEffect="non-scaling-stroke" />
  </g>;
}

export function BeautyWheelPointer({ color, path, className }: { color: string; path?: string; className?: string }) {
  const gradientId = `beauty-pointer-${useId().replace(/:/g, "")}`;
  return <svg aria-hidden="true" data-testid="beauty-wheel-pointer" className={className} viewBox="0 0 48 64"
    style={{ filter: "drop-shadow(0 4px 4px rgba(58,43,39,.24))", "--pointer-color": color } as CSSProperties}>
    <defs>
      <linearGradient id={gradientId} x1="10%" y1="5%" x2="85%" y2="95%">
        <stop offset="0%" stopColor={color} />
        <stop offset="16%" stopColor="color-mix(in srgb, white 36%, var(--pointer-color))" />
        <stop offset="46%" stopColor={color} />
        <stop offset="100%" stopColor="color-mix(in srgb, black 24%, var(--pointer-color))" />
      </linearGradient>
    </defs>
    <path data-testid="beauty-pointer-body"
      d={path ?? "M24 2 C35 2 43 10 43 21 C43 34 32 48 24 62 C16 48 5 34 5 21 C5 10 13 2 24 2Z"}
      fill={`url(#${gradientId})`} stroke="#ffffff" strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M15 15 C18 10 23 9 28 11" fill="none" stroke="#ffffff" strokeOpacity=".72" strokeWidth="1.6" strokeLinecap="round" />
  </svg>;
}

export function BeautyLogoRule({ color }: { color: string }) {
  return <span aria-hidden="true" data-testid="beauty-logo-rule" className="mx-auto mt-2.5 block h-px w-8 opacity-65" style={{ backgroundColor: color }} />;
}
