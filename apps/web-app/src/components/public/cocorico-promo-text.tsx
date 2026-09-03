import { buildCocoricoPromoLines } from "@/lib/campaign-defaults";

type CocoricoPromoTextProps = {
  text: string;
  as?: "h1" | "h3";
  fontSize?: string | number;
  fontFamily?: string;
};

export function CocoricoPromoText({ text, as = "h1", fontSize, fontFamily }: CocoricoPromoTextProps) {
  const Tag = as;
  const lines = buildCocoricoPromoLines(text);

  return (
    <Tag
      className="okado-cocorico-promo-text"
      aria-label={text}
      style={fontSize === undefined && fontFamily === undefined ? undefined : {
        ...(fontSize === undefined ? {} : { fontSize: typeof fontSize === "number" ? `${fontSize}px` : fontSize }),
        ...(fontFamily === undefined ? {} : { fontFamily }),
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
