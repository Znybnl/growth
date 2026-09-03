import { buildCocoricoPromoLines } from "@/lib/campaign-defaults";

type CocoricoPromoTextProps = {
  text: string;
  as?: "h1" | "h3";
  fontSize?: string | number;
  fontFamily?: string;
  rotate?: boolean;
};

export function CocoricoPromoText({ text, as = "h1", fontSize, fontFamily, rotate = true }: CocoricoPromoTextProps) {
  const Tag = as;
  const lines = buildCocoricoPromoLines(text);

  return (
    <Tag
      className="okado-cocorico-promo-text"
      aria-label={text}
      style={{
        ...(fontSize === undefined ? {} : { fontSize: typeof fontSize === "number" ? `${fontSize}px` : fontSize }),
        ...(fontFamily === undefined ? {} : { fontFamily }),
        ...(rotate ? {} : { transform: "none" }),
      }}
    >
      {lines.map((line, index) => (
        <span
          className="okado-cocorico-promo-line"
          data-text={line}
          key={`${line}-${index}`}
        >
          {line}
        </span>
      ))}
    </Tag>
  );
}
