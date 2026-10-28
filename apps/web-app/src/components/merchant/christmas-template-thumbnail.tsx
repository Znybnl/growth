import Image from "next/image";
import { ChristmasWheelVisual } from "@/components/public/christmas-wheel-art";
import { christmasWheelArtwork, christmasWheelTheme, type ChristmasWheelTemplateId } from "@/lib/christmas-wheel-themes";
import styles from "@/components/public/christmas-wheel.module.css";

export function ChristmasTemplateThumbnail({ templateId, card }: { templateId: ChristmasWheelTemplateId; card: boolean }) {
  const theme = christmasWheelTheme(templateId)!;
  const labels = ["-10%", "SOIN OFFERT", "SURPRISE", "PERDU", "-15%", "BONUS"];
  return <div aria-hidden="true" data-testid={`wheel-template-thumbnail-${templateId}`} className={card ? styles.thumbnailCard : "relative mb-3 h-28 overflow-hidden rounded-xl"} style={{ position: "relative", backgroundColor: theme.background }}>
    <Image src={christmasWheelArtwork(templateId)} alt="" fill sizes="240px" className="object-cover" />
    <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${theme.background}d9, ${theme.background}40 48%, transparent 70%)` }} />
    {card ? <div className={styles.thumbnailCopy} style={{ color: theme.text }}>
      <div className={styles.thumbnailBrand} style={{ color: theme.logo }}>Votre établissement</div>
      <div className={styles.thumbnailTitle} data-testid="template-sample-heading">Jouez &amp;<br />gagnez</div>
      <div className={styles.thumbnailSubtitle} style={{ color: theme.logo }}>De belles surprises vous attendent pour Noël</div>
    </div> : null}
    <div className={card ? styles.thumbnailWheel : "relative mx-auto w-24 pt-2"}>
      <ChristmasWheelVisual templateId={templateId} segments={labels.map((label, index) => ({ id: `sample-${index}`, label, tone: index === 3 ? "lose" as const : "win" as const }))} interactive={false} />
    </div>
  </div>;
}
