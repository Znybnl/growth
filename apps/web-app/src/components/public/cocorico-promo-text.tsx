import { buildCocoricoPromoLines } from "@/lib/campaign-defaults";

type CocoricoPromoTextProps = {
  text: string;
  as?: "h1" | "h3";
};

export function CocoricoPromoText({ text, as = "h1" }: CocoricoPromoTextProps) {
  const Tag = as;
  const lines = buildCocoricoPromoLines(text);

  return (
    <Tag className="okado-cocorico-promo-text" aria-label={text}>
      {lines.map((line, index) => (
        <span
          className="okado-cocorico-promo-line"
          data-text={line.toUpperCase()}
          key={`${line}-${index}`}
        >
          {line}
        </span>
      ))}
    </Tag>
  );
}
