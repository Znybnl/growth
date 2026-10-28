import Image from "next/image";
import type { GameModel } from "@/lib/marketing-examples";
import styles from "./showcase.module.css";

export function GamePreview({ model, eager = false, sizes = "208px" }: { model: GameModel; eager?: boolean; sizes?: string }) {
  return (
    <div className={styles.phone}>
      <Image src={model.image}
        alt={`Rendu Okado du modèle ${model.name} — ${model.type}, exemple fictif`}
        sizes={sizes} loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined} />
    </div>
  );
}
