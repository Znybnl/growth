import Image from "next/image";
import type { GameModel } from "@/lib/marketing-examples";
import styles from "./showcase.module.css";

export function GamePreview({ model, eager = false }: { model: GameModel; eager?: boolean }) {
  return (
    <div className={styles.phone}>
      <Image src={`/images/${model.image}.webp`} width={720} height={1280}
        alt={`Rendu Okado du modèle ${model.name} — ${model.type}, exemple fictif`}
        sizes="(min-width: 768px) 240px, 210px" loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined} />
    </div>
  );
}
