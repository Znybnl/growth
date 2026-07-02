import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "CGV et abonnement | Okado",
  description:
    "Conditions générales de vente, d'abonnement et accord de traitement des données de la plateforme Okado.",
};

const sections = [
  {
    title: "Article 1 - Définitions et objet",
    paragraphs: [
      "Les présentes Conditions Générales de Vente et d’Abonnement régissent l’accès et l’utilisation de la plateforme logicielle Okado, distribuée en mode SaaS par la société BRUNELLE PEROLS INVESTISSEMENT, ci-après l’Éditeur.",
      "Toute personne physique ou morale souscrivant aux services de la plateforme dans le cadre de son activité professionnelle est dénommée le Client.",
    ],
  },
  {
    title: "Article 2 - Offre d’abonnement et période d’essai",
    paragraphs: [
      "Lors de sa première inscription, le Client bénéficie d’une période d’essai gratuite de trente jours, active dès la validation du compte.",
      "À l’issue de cette période d’essai, l’accès aux fonctionnalités d’exportation de données et aux fonctionnalités avancées peut être suspendu, sauf si le Client souscrit à l’Abonnement Pro.",
    ],
  },
  {
    title: "Article 3 - Tarification et modalités de paiement",
    paragraphs: [
      "L’Abonnement Pro est facturé selon les tarifs en vigueur au jour de la souscription, tels qu’indiqués sur le site officiel okado.app. L’Éditeur se réserve le droit de modifier ses tarifs à tout moment.",
      "En cas d’augmentation, le nouveau tarif sera notifié au Client moyennant un préavis de trente jours avant sa prise d’effet. Si le Client refuse cette modification, il lui appartient de résilier son abonnement avant l’application du nouveau tarif. À défaut, le Client est réputé avoir accepté la nouvelle tarification.",
      "Les prix sont affichés en euros pour la France et l’Europe, et en dollars canadiens pour le marché nord-américain, sauf indication contraire affichée lors de la souscription.",
      "Les tarifs s’entendent hors taxes. Pour la France, la TVA standard au taux légal en vigueur s’ajoute au moment de la facturation. Pour le Canada, les taxes fédérales et provinciales applicables s’ajoutent selon la province de résidence du Client.",
      "Les transactions sont opérées exclusivement de manière sécurisée via l’infrastructure Stripe par prélèvement mensuel automatique.",
      "Tout défaut ou retard de paiement à l’échéance entraînera de plein droit l’application de pénalités de retard égales à trois fois le taux d’intérêt légal en vigueur en France, le paiement d’une indemnité forfaitaire pour frais de recouvrement d’un montant de quarante euros hors taxes ou équivalent en devise, ainsi que la suspension immédiate de l’accès à la plateforme jusqu’au complet paiement des sommes dues.",
    ],
  },
  {
    title: "Article 4 - Durée et résiliation",
    paragraphs: [
      "L’Abonnement Pro Okado est conclu pour une durée d’un mois, renouvelable tacitement par périodes successives de même durée.",
      "L’abonnement est sans engagement. Le Client peut résilier son abonnement à tout moment via le portail client de paiement.",
      "La résiliation prend effet à la fin de la période de facturation mensuelle en cours. Tout mois entamé reste dû dans son intégralité et ne donne lieu à aucun remboursement prorata temporis.",
    ],
  },
  {
    title: "Article 5 - Disponibilité de la plateforme et maintenance",
    paragraphs: [
      "L’Éditeur s’efforce d’assurer l’accès à la plateforme 24 heures sur 24 et 7 jours sur 7. Toutefois, l’Éditeur n’est tenu qu’à une obligation de moyens concernant la disponibilité technique du service.",
      "Aucun niveau de service minimal n’est garanti. L’Éditeur se réserve le droit d’interrompre temporairement et sans préavis l’accès à la plateforme pour mener des opérations de maintenance, de mise à jour ou d’amélioration technique.",
      "La responsabilité de l’Éditeur ne pourra être engagée en cas d’indisponibilité, de ralentissements, de bogues ou de pertes d’exploitation subies par le Client à ce titre.",
    ],
  },
  {
    title: "Article 6 - Responsabilité de l’Éditeur",
    paragraphs: [
      "La responsabilité de l’Éditeur est strictement limitée aux obligations de moyens stipulées aux présentes.",
      "En aucun cas l’Éditeur ne pourra être tenu responsable des dommages indirects, pertes de chance, pertes de bénéfices, pertes de données ou pertes de chiffre d’affaires subis par le Client.",
      "Si la responsabilité financière de l’Éditeur envers le Client venait à être engagée, toutes causes confondues, elle serait expressément et globalement plafonnée aux sommes effectivement perçues par l’Éditeur au titre de l’abonnement au cours des trois derniers mois précédant le fait générateur du litige.",
      "Ce plafond ne s’applique pas en cas de dommage corporel, de fraude, de dol ou de faute lourde de l’Éditeur.",
    ],
  },
  {
    title: "Article 7 - Propriété intellectuelle et licence",
    paragraphs: [
      "La marque Okado, les codes sources, l’architecture logicielle, les algorithmes et les designs d’interfaces sont et demeurent la propriété exclusive de BRUNELLE PEROLS INVESTISSEMENT.",
      "L’Éditeur concède au Client, pour la durée de son abonnement, un droit d’utilisation personnel, non exclusif, non transférable et non cessible de la plateforme, pour ses seuls besoins professionnels.",
      "Le Client demeure propriétaire exclusif de l’intégralité des données importées, collectées ou traitées par lui sur la plateforme. Il concède à l’Éditeur une licence gratuite et limitée d’hébergement et de traitement de ces données pour les stricts besoins du bon fonctionnement et de l’exécution des services.",
    ],
  },
  {
    title: "Article 8 - Force majeure",
    paragraphs: [
      "Aucune des parties ne pourra être tenue responsable d’un manquement à ses obligations contractuelles si ce manquement est dû à un cas de force majeure au sens de l’article 1218 du Code civil français.",
      "Sont notamment assimilés à des cas de force majeure les incendies ou pannes de centres de données, les cyberattaques massives, les interruptions prolongées des réseaux de télécommunication ou de fourniture d’énergie échappant au contrôle de l’Éditeur.",
    ],
  },
  {
    title: "Article 9 - Loi applicable et tribunaux compétents",
    paragraphs: [
      "Les présentes conditions sont régies exclusivement par le droit français.",
      "Tout litige relatif à leur interprétation, leur exécution, leur résiliation ou leur validité entre l’Éditeur et un Client professionnel sera soumis à la compétence exclusive du Tribunal de Commerce de Versailles, nonobstant pluralité de défendeurs ou appel en garantie.",
    ],
  },
  {
    title: "Annexe - Accord sur le traitement des données (DPA)",
    paragraphs: [
      "Dans le cadre de l’utilisation de la plateforme Okado, l’Éditeur est amené à traiter des données à caractère personnel pour le compte du Client. Le Client agit en qualité de responsable du traitement et l’Éditeur agit en qualité de sous-traitant.",
      "La plateforme fournit un outil SaaS permettant le recueil, la centralisation et la gestion de données de clients et de prospects pour le compte des utilisateurs marchands, afin de leur permettre de piloter leur activité commerciale et marketing.",
      "Les catégories de personnes concernées sont les clients finaux et prospects du Client. Les types de données traitées peuvent inclure des données d’identification telles que noms, prénoms, adresses e-mail, numéros de téléphone et toute autre donnée commerciale ou de navigation collectée via l’outil.",
      "L’Éditeur s’engage à traiter les données personnelles uniquement sur instructions documentées du Client, à veiller à la confidentialité des personnes autorisées à traiter ces données, à mettre en œuvre des mesures de sécurité appropriées et à notifier le Client dans les meilleurs délais en cas de violation de données personnelles.",
      "Le Client autorise l’Éditeur à faire appel à des sous-traitants ultérieurs, notamment Stripe pour le paiement, Vercel pour l’hébergement de l’application et Supabase pour la base de données. L’Éditeur s’engage à répercuter les mêmes obligations de protection des données sur ses sous-traitants ultérieurs.",
      "Le Client reconnaît que la plateforme fournit l’infrastructure technique permettant la collecte directe de données auprès d’utilisateurs finaux. Il est seul responsable de fournir les mentions d’information obligatoires, les textes juridiques et les modalités de recueil du consentement devant être affichés sur l’interface du jeu.",
      "Le Client garantit l’Éditeur contre toute action, réclamation ou condamnation émanant d’un utilisateur final ou d’une autorité de contrôle résultant d’une absence, d’une insuffisance ou d’une non-conformité des mentions d’information ou des consentements collectés via l’interface configurée par le Client.",
    ],
  },
];

export default function TermsOfSalePage() {
  return (
    <LegalPage
      title="Conditions générales de vente et d’abonnement"
      subtitle="Conditions applicables à la souscription et à l’utilisation professionnelle de la plateforme SaaS Okado."
      sections={sections}
    />
  );
}
