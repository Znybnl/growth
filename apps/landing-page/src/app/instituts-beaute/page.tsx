import { SectorPage } from "@/components/marketing/sector-page";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata(
  "/instituts-beaute",
  "Jeu QR code institut de beauté : roue et ticket personnalisés | Okado",
  "Personnalisez votre roue ou ticket à gratter, choisissez les lots adaptés à vos prestations et suivez les retraits. Essai gratuit de 30 jours.",
);

export default function Page() {
  return <SectorPage beauty={true} />;
}
