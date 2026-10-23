"use client";

import { useId } from "react";

/** Stationary trim: deliberately outside the rotating segments. */
export function BeautyPopRim({ color }: { color: string }) {
  const id = `beauty-pop-gold-${useId().replace(/:/g, "")}`;
  return <svg aria-hidden="true" data-testid="beauty-pop-stationary-rim" viewBox="0 0 640 640" className="pointer-events-none absolute inset-0 z-20 size-full overflow-visible">
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#fff5d5" /><stop offset=".12" stopColor={`color-mix(in srgb, ${color} 75%, black)`} /><stop offset=".25" stopColor="#fff9de" />
        <stop offset=".43" stopColor={color} /><stop offset=".55" stopColor={`color-mix(in srgb, ${color} 65%, black)`} /><stop offset=".72" stopColor="#fff9de" /><stop offset=".9" stopColor={color} /><stop offset="1" stopColor="#fff3c7" />
      </linearGradient>
    </defs>
    <g data-testid="beauty-wheel-rim">
      <circle cx="320" cy="320" r="312" fill="none" stroke={color} strokeWidth="17" />
      <circle cx="320" cy="320" r="312" fill="none" stroke={`url(#${id})`} strokeWidth="14" />
      <circle cx="320" cy="320" r="320" fill="none" stroke="#fff5dc" strokeWidth="1.5" />
      <circle data-testid="beauty-wheel-colored-rim" cx="320" cy="320" r="304" fill="none" stroke={color} strokeWidth="3.2" />
    </g>
    <path d="M96 103 A312 312 0 0 1 536 96 M544 538 A312 312 0 0 1 104 544" fill="none" stroke="#fff8e8" strokeWidth="2.2" strokeLinecap="round" />
    {Array.from({length:24},(_,i)=>{
      const angle=i*Math.PI/12;
      // Stable serialization across Node/V8 versions and browser hydration.
      return <circle key={i} cx={(320+312*Math.sin(angle)).toFixed(3)} cy={(320-312*Math.cos(angle)).toFixed(3)} r="5.4" fill="#fffdf2" className="okado-beauty-pop-bulb" />;
    })}
  </svg>;
}
