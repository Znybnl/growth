import type { ContentSection } from "@/lib/public-content";

export type BlogPost = {
  path: string;
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  sections: ContentSection[];
  related: string[];
  source?: { label: string; href: string }[];
  author: string;
  publishedAt: string;
  updatedAt: string;
  reviewedAt: string;
  readingTime: string;
  image?: string;
};

export const blogPosts: BlogPost[] = [
  {
    path: "/blog/idees-animations-commerciales-boutique",
    title: "15 idées d’animations commerciales pour attirer des clients en boutique",
    description:
      "Découvrez 15 idées d’animations commerciales pour créer du passage en boutique, faire participer vos clients et préparer une opération réaliste.",
    eyebrow: "Marketing local",
    intro:
      "Une bonne animation commerciale ne se résume pas à une remise. Elle donne une raison concrète d’entrer, de participer ou de revenir, tout en restant simple à expliquer à l’équipe.",
    author: "L’équipe Okado",
    publishedAt: "2026-10-17",
    updatedAt: "2026-10-17",
    reviewedAt: "2026-10-17",
    readingTime: "8 min de lecture",
    sections: [
      {
        title: "Commencez par un objectif précis",
        paragraphs: [
          "Avant de choisir une animation, décidez ce que vous voulez provoquer : faire découvrir un produit, occuper un temps d’attente, encourager une prochaine visite ou créer un moment fort avec votre équipe. Un seul objectif principal rend le message plus lisible et facilite le bilan.",
          "Une animation ne prouve pas à elle seule une hausse du chiffre d’affaires. Elle peut en revanche être conçue avec un parcours observable : affichage, participation, gain, retrait ou retour en boutique. Cette distinction évite de confondre une activité mesurée avec une vente automatiquement attribuée.",
        ],
      },
      {
        title: "15 idées d’animations à adapter à votre commerce",
        paragraphs: [
          "Les idées ci-dessous sont des formats à adapter à votre activité, votre équipe et vos conditions commerciales. Les coûts et résultats ne sont pas universels : prévoyez les contraintes avant de publier l’offre.",
        ],
        items: [
          "Jeu par QR code à l’accueil : une roue ou un ticket fait découvrir une dotation définie à l’avance.",
          "Tirage au sort parmi les participants d’une journée ou d’un week-end.",
          "Démonstration produit avec une mini-expérience à réaliser sur place.",
          "Atelier court : personnalisation, dégustation, conseil ou découverte d’un savoir-faire.",
          "Lancement d’un nouveau produit accompagné d’un avantage limité et clairement daté.",
          "Partenariat avec un commerce voisin pour croiser les audiences locales.",
          "Défi photo ou mise en scène en boutique, sans conditionner une récompense à un avis public.",
          "Offre sur un créneau calme pour mieux répartir le flux de visites.",
          "Animation en caisse qui propose une prochaine visite plutôt qu’une remise illimitée.",
          "Journée thématique liée à votre activité et à un produit réellement disponible.",
          "Programme ambassadeur présenté comme une invitation, avec des règles et un consentement explicites.",
          "Échantillonnage ou découverte d’un format réduit, si le stock et les conditions le permettent.",
          "Opération saisonnière avec une durée, une dotation et une date de fin visibles.",
          "Collecte de contacts facultative, séparée de la participation et de toute prospection future.",
          "Déclinaison d’une même animation sur plusieurs établissements, après contrôle de chaque QR et de chaque condition.",
        ],
      },
      {
        title: "Choisissez une récompense facile à comprendre",
        paragraphs: [
          "Un lot utile n’est pas nécessairement le plus cher. Il doit être compréhensible au moment de la participation, compatible avec votre capacité de service et accompagné de conditions visibles : durée de validité, éventuel achat requis, produits concernés et modalités de retrait.",
          "Dans une animation numérique, le marchand choisit ses lots, ses probabilités et ses stocks. Une probabilité indique une répartition prévue, pas un nombre garanti de retraits. Pour une première opération, quelques lots simples sont souvent plus faciles à expliquer qu’un catalogue trop large.",
        ],
      },
      {
        title: "Rendez l’animation visible et testable",
        paragraphs: [
          "Placez votre message là où le client a réellement le temps de le lire : accueil, attente, table, comptoir ou caisse selon votre activité. Une affiche promet une expérience ; elle ne doit pas masquer les conditions essentielles ni annoncer un gain indisponible.",
          "Si vous utilisez un QR code, testez un exemplaire imprimé avec plusieurs téléphones et à la distance réelle. Distinguez le QR de prévisualisation du QR public de participation, puis vérifiez le nom de l’établissement, les dates et le parcours avant diffusion.",
        ],
      },
      {
        title: "Mesurez ce qui s’est réellement passé",
        paragraphs: [
          "Suivez séparément les scans, les participations, les contacts collectés, les gains et les retraits. Un scan n’est pas une partie ; un clic vers un service tiers ne prouve pas un avis publié ; un gain attribué n’est pas forcément un gain retiré.",
          "Comparez des périodes comparables et notez les changements de support, de lot, d’horaires ou de fréquentation. Une mesure honnête produit de meilleurs arbitrages qu’un pourcentage spectaculaire sans méthode.",
        ],
      },
      {
        title: "La meilleure idée est celle que l’équipe peut délivrer",
        paragraphs: [
          "Avant de lancer une animation, écrivez en une phrase ce que le client doit faire, ce que l’équipe doit vérifier et ce qui doit être mesuré. Si le retrait est possible, prévoyez qui contrôle les dates et les conditions. Si une collecte d’e-mail est proposée, séparez-la du consentement marketing.",
          "Okado peut servir à créer une animation mobile par QR code, avec une roue ou un ticket à gratter, des lots, une affiche et un suivi des gains et retraits. Le choix de l’animation, du budget et des conditions reste celui du commerce.",
        ],
      },
    ],
    related: [
      "/comment-ca-marche",
      "/affiches-qr-code",
      "/guides/mesurer-jeu-qr-code",
      "/tarifs",
    ],
    source: [
      {
        label: "Google Search Central — contenu utile",
        href: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
      },
    ],
  },
];

export function blogPostByPath(path: string) {
  return blogPosts.find((post) => post.path === path);
}
