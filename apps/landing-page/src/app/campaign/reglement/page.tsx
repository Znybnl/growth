import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "CGU et règlement du jeu | Okado",
  description:
    "Conditions générales d'utilisation et règlement applicable aux jeux concours phygitaux déployés avec Okado.",
};

const sections = [
  {
    title: "Préambule et définitions",
    paragraphs: [
      "Le présent document régit les conditions de participation aux jeux-concours phygitaux déployés en point de vente via la solution logicielle Okado.",
      "La Société Organisatrice, aussi appelée le Marchand, désigne l’établissement professionnel au sein duquel le jeu est déployé. Elle définit les règles spécifiques, les dotations, les probabilités de gain et assume l’entière responsabilité légale de l’organisation du jeu.",
      "Le Prestataire Technique, ou l’Éditeur, désigne la société BRUNELLE PEROLS INVESTISSEMENT, éditrice de la solution SaaS Okado, agissant exclusivement en qualité de fournisseur d’infrastructure technique.",
      "Le Participant désigne toute personne physique majeure participant au jeu via le scan d’un QR Code en point de vente.",
    ],
  },
  {
    title: "Article 1 - Objet et acceptation",
    paragraphs: [
      "La participation au jeu implique l’acceptation expresse, pleine et entière, sans réserve, du présent règlement par le Participant.",
      "Ce règlement régit les relations entre le Participant et la Société Organisatrice. L’Éditeur de la solution Okado est un tiers à cette relation et intervient uniquement comme prestataire technique.",
    ],
  },
  {
    title: "Article 2 - Mécanique du jeu et participation",
    paragraphs: [
      "La participation au jeu s’effectue exclusivement en scannant le QR Code mis à disposition au sein de l’établissement de la Société Organisatrice.",
      "Selon le paramétrage défini sous la seule responsabilité de la Société Organisatrice, le Participant pourra être invité à consulter des liens externes, tels que la fiche Google Business Profile de l’établissement ou un réseau social.",
      "Le dépôt d’un avis en ligne est strictement facultatif. Il ne constitue en aucun cas une condition obligatoire de participation ni une obligation pour valider l’obtention d’un gain.",
      "L’Éditeur décline toute responsabilité quant à l’utilisation de ces fonctionnalités par la Société Organisatrice au regard des conditions d’utilisation des plateformes tierces, notamment Google.",
    ],
  },
  {
    title: "Article 3 - Désignation des gagnants et responsabilité des lots",
    paragraphs: [
      "L’attribution des gains est gérée automatiquement dès la soumission du formulaire, via un mécanisme de tirage aléatoire tenant compte des probabilités et des stocks paramétrés par la Société Organisatrice.",
      "La Société Organisatrice est seule responsable de la fourniture, de la conformité, de la disponibilité et de la remise effective des lots.",
      "La responsabilité du Prestataire Technique ne saurait être engagée pour toute réclamation relative à une rupture de stock, un défaut du lot, un refus de remise par le personnel en magasin ou tout litige lié à l’exécution du jeu.",
    ],
  },
  {
    title: "Article 4 - Modalités de récupération des lots",
    paragraphs: [
      "En cas de gain, le Participant reçoit un e-mail de confirmation à l’adresse renseignée lors de sa participation, contenant un QR Code unique et personnel.",
      "Le Participant doit présenter ce QR Code au personnel de la Société Organisatrice pour récupérer son lot.",
      "La remise du lot n’est définitive qu’après validation de ce QR Code par le personnel habilité, par scan direct ou via la plateforme de gestion Okado.",
      "Un QR Code de gain ne peut être utilisé qu’une seule fois. Toute tentative de réutilisation pourra entraîner le refus de remise du lot.",
    ],
  },
  {
    title: "Article 5 - Prévention de la fraude et litiges techniques",
    paragraphs: [
      "La participation est strictement nominative et peut être limitée selon les règles définies par la Société Organisatrice, notamment par jour, par établissement ou par campagne.",
      "La Société Organisatrice se réserve le droit, à sa seule discrétion, d’annuler la participation ou de refuser la remise d’un lot à toute personne ayant tenté de frauder, notamment par l’utilisation de pseudonymes multiples, d’adresses e-mails frauduleuses ou de captures d’écran falsifiées.",
      "En cas de dysfonctionnement technique temporaire de la plateforme Okado, du réseau internet en magasin ou de l’appareil du Participant empêchant la validation, aucune compensation financière ou matérielle ne pourra être exigée auprès du Prestataire Technique.",
    ],
  },
  {
    title: "Article 6 - Protection des données personnelles",
    paragraphs: [
      "Dans le cadre du jeu, des données à caractère personnel peuvent être collectées, notamment le prénom, l’adresse e-mail et les informations nécessaires à la gestion du gain.",
      "La Société Organisatrice agit en qualité de responsable de traitement. Les données sont collectées pour ses besoins légitimes de gestion du jeu et, sous réserve du consentement du Participant, pour l’envoi de prospection commerciale.",
      "Le Prestataire Technique agit en qualité de sous-traitant. Il héberge ces données de manière sécurisée pour le compte exclusif de la Société Organisatrice.",
      "Conformément à la réglementation applicable, notamment le RGPD en Europe et la LPRPDE au Canada, le Participant dispose d’un droit d’accès, de rectification, de portabilité et d’effacement de ses données. Pour exercer ces droits, il doit s’adresser directement à la Société Organisatrice par le biais de ses coordonnées habituelles.",
    ],
  },
  {
    title: "Article 7 - Limites de responsabilité technique",
    paragraphs: [
      "Le Prestataire Technique met en œuvre les moyens nécessaires au bon fonctionnement de l’infrastructure du jeu, sans garantir l’absence totale d’interruption, d’erreur ou de ralentissement.",
      "La responsabilité du Prestataire Technique ne saurait être engagée en cas de non-réception de l’e-mail de confirmation due à une erreur de saisie du Participant, à un filtrage anti-spam ou à une défaillance du fournisseur de messagerie du Participant.",
      "La responsabilité du Prestataire Technique ne saurait davantage être engagée en cas d’interruption du réseau internet en magasin, de dysfonctionnement du smartphone du Participant ou de bogue technique temporaire empêchant la finalisation de la participation.",
    ],
  },
  {
    title: "Article 8 - Dotations, stocks et probabilités de gain",
    paragraphs: [
      "La liste des lots, leur quantité disponible, leur durée de validité et leurs conditions d’utilisation sont définies par la Société Organisatrice pour chaque campagne.",
      "Les probabilités de gain sont déterminées par le paramétrage effectué par la Société Organisatrice dans la plateforme Okado. Elles peuvent varier selon le nombre de lots, les stocks disponibles, la mécanique de jeu choisie et la configuration de la campagne.",
      "Les gains sont attribués dans la limite des quantités de stock disponibles. Lorsqu’un lot est épuisé, il ne peut plus être attribué, sauf réinitialisation ou modification du stock par la Société Organisatrice.",
      "Lorsque la campagne affiche une mécanique dite 100% gagnante, cette garantie s’entend sous réserve de la disponibilité effective d’au moins un lot au moment de la participation.",
    ],
  },
];

export default function GameRulesPage() {
  return (
    <LegalPage
      title="Conditions générales d'utilisation et règlement du jeu"
      subtitle="Règlement applicable aux jeux concours phygitaux déployés en point de vente via la solution Okado."
      sections={sections}
    />
  );
}
