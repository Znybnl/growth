import { SectorPage } from "@/components/marketing/sector-page";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata(
  "/restaurants",
  "Jeu QR code restaurant : roue, ticket et retrait des gains | Okado",
  "Créez un jeu mobile pour votre restaurant avec vos lots, une affiche QR et le suivi des participations et retraits. 30 jours d’essai sans carte.",
);

export default function Page() {
  return <SectorPage beauty={false} />;
}
