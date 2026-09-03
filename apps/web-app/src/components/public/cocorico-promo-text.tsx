import { buildCocoricoPromoLines } from "@/lib/campaign-defaults";
import type { CSSProperties } from "react";

type CocoricoPromoTextProps = {
  text: string;
  as?: "h1" | "h3";
  fontSize?: string | number;
  fontFamily?: string;
  fontWeight?: number;
  textColor?: string;
  secondaryTextColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  variant?: "cocorico" | "inspired";
  splitLines?: boolean;
  rotate?: boolean;
};

export function CocoricoPromoText({
  text,
  as = "h1",
  fontSize,
  fontFamily,
  fontWeight = 700,
  textColor = "#ffdc32",
  secondaryTextColor = "#ffffff",
  strokeColor = "#102c6a",
  strokeWidth = 16,
  variant = "cocorico",
  splitLines = variant === "cocorico",
  rotate = true,
}: CocoricoPromoTextProps) {
  const Tag = as;
  const lines = splitLines ? buildCocoricoPromoLines(text) : [text];

  return (
    <Tag
      className="okado-cocorico-promo-text"
      data-promo-variant={variant}
      aria-label={text}
      style={{
        ...(fontSize === undefined ? {} : { fontSize: typeof fontSize === "number" ? `${fontSize}px` : fontSize }),
        ...(fontFamily === undefined ? {} : { fontFamily }),
        fontWeight,
        color: textColor,
        "--okado-promo-secondary-color": secondaryTextColor,
        "--okado-promo-stroke-color": strokeColor,
        "--okado-promo-stroke-width": `${strokeWidth}px`,
        ...(rotate ? {} : { transform: "none" }),
      } as CSSProperties}
    >
      {lines.map((line, index) => (
        <span
          className="okado-cocorico-promo-line"
          data-text={line}
          style={{ color: index === 0 ? textColor : secondaryTextColor }}
          key={`${line}-${index}`}
        >
          {line}
        </span>
      ))}
    </Tag>
  );
}
