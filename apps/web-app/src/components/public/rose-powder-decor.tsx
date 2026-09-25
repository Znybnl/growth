import type { CSSProperties } from "react";

/** Decorative layer shared by the real game and merchant previews. */
export function RosePowderDecor({ primaryColor }: { primaryColor: string }) {
  return (
    <div
      aria-hidden="true"
      className="okado-rose-powder-decor"
      style={{ "--rose-accent": primaryColor } as CSSProperties}
    >
      <span className="okado-rose-powder-decor__glow okado-rose-powder-decor__glow--top" />
      <span className="okado-rose-powder-decor__glow okado-rose-powder-decor__glow--bottom" />
      {Array.from({ length: 7 }, (_, index) => (
        <span className={`okado-rose-powder-decor__petal okado-rose-powder-decor__petal--${index + 1}`} key={index} />
      ))}
    </div>
  );
}

/** A four-petal abstract flower, not a prize or profession pictogram. */
export function RoseFlowerMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 40 40" fill="none">
      {[0, 90, 180, 270].map((rotation) => (
        <path
          key={rotation}
          d="M20 18.5C15.9 15.5 15.3 9.6 20 5c4.7 4.6 4.1 10.5 0 13.5Z"
          transform={`rotate(${rotation} 20 20)`}
          fill="currentColor"
          fillOpacity="0.12"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      ))}
      <circle cx="20" cy="20" r="2.5" fill="currentColor" />
    </svg>
  );
}
