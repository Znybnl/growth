import Image from "next/image";
import { ChristmasWheelVisual } from "@/components/public/christmas-wheel-art";
import { christmasWheelArtwork, christmasWheelTheme, type ChristmasWheelTemplateId } from "@/lib/christmas-wheel-themes";

export function ChristmasTemplateThumbnail({ templateId, card }: { templateId: ChristmasWheelTemplateId; card: boolean }) {
  const theme = christmasWheelTheme(templateId)!;
  const labels = ["-10%", "SOIN OFFERT", "SURPRISE", "PERDU", "-15%", "BONUS"];
  return <div aria-hidden="true" data-testid={`wheel-template-thumbnail-${templateId}`} className={`relative overflow-hidden ${card ? "h-full px-4 pt-3" : "mb-3 h-28 rounded-xl"}`} style={{ backgroundColor: theme.background }}>
    <Image src={christmasWheelArtwork(templateId)} alt="" fill sizes="240px" className="object-cover" />
    <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${theme.background}d9, ${theme.background}40 48%, transparent 70%)` }} />
    {card ? <div className="relative z-10 max-w-[48%]" style={{ color: theme.text }}>
      <div className="min-h-[20px] text-[8px] font-semibold leading-tight" style={{ color: theme.logo }}>Votre établissement</div>
      <div className="mt-2 font-bodoni text-[20px] leading-[1.05]" data-testid="template-sample-heading">Jouez &amp;<br />gagnez</div>
      <div className="mt-2 font-serif text-[8px] leading-[1.35]" style={{ color: theme.logo }}>De belles surprises vous attendent pour Noël</div>
    </div> : null}
    <div className={card ? "absolute -bottom-2 -right-2 w-32" : "relative mx-auto w-24 pt-2"}>
      <ChristmasWheelVisual templateId={templateId} segments={labels.map((label, index) => ({ id: `sample-${index}`, label, tone: index === 3 ? "lose" as const : "win" as const }))} interactive={false} />
    </div>
  </div>;
}
