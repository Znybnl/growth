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
  ctaLabel?: string;
  ctaHref?: string;
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
  {
    path: "/blog/animer-point-de-vente-qr-code",
    title: "Comment utiliser un QR code pour animer un point de vente ?",
    description:
      "Découvrez comment utiliser un QR code pour animer un point de vente : emplacement, parcours mobile, test avant impression et indicateurs à suivre.",
    eyebrow: "Animation locale",
    intro:
      "Un QR code peut transformer un support imprimé en point d’entrée vers une animation mobile. Pour qu’il génère une expérience utile en magasin, il faut surtout soigner la promesse, le parcours et les conditions de participation.",
    author: "L’équipe Okado",
    publishedAt: "2026-10-17",
    updatedAt: "2026-10-17",
    reviewedAt: "2026-10-17",
    readingTime: "7 min de lecture",
    ctaLabel: "Voir un exemple d’animation QR code",
    ctaHref: "/comment-ca-marche",
    sections: [
      {
        title: "Un QR code ne crée pas l’animation à lui seul",
        paragraphs: [
          "Le QR code est un accès rapide depuis une affiche, un comptoir ou un autre support visible. Il ne remplace ni une promesse claire ni une expérience conçue pour le téléphone. Avant de l’imprimer, formulez ce que le client découvre après le scan et ce que votre équipe doit pouvoir délivrer.",
          "Dans un point de vente, une animation peut servir à occuper un temps d’attente, créer un moment de surprise, faire connaître un produit ou préparer une prochaine visite. Choisissez un objectif principal : un message trop général rend le scan moins compréhensible et le bilan plus difficile.",
        ],
      },
      {
        title: "Choisissez ce que le QR code doit déclencher",
        paragraphs: [
          "Un jeu mobile est pertinent lorsque vous voulez proposer une participation courte et visible : roue de la fortune, ticket à gratter, lot ou avantage défini par le commerce. Le client accède au jeu dans son navigateur, sans installer d’application ni créer de compte joueur.",
          "Vous pouvez aussi utiliser le QR code pour prolonger une animation déjà expliquée en boutique, par exemple vers une page qui détaille les conditions ou le parcours. Dans tous les cas, l’appel à l’action doit décrire l’étape suivante : participer, découvrir son résultat ou conserver les informations nécessaires au retrait.",
          "Les liens vers un avis, un réseau social ou un autre service ne doivent pas être présentés comme une preuve d’action accomplie. L’accès au jeu et l’obtention d’un gain ne doivent pas dépendre d’un avis ou de sa note ; une collecte d’e-mail marketing reste facultative et distincte.",
        ],
      },
      {
        title: "Placez le QR code là où le client peut agir",
        paragraphs: [
          "Un bon emplacement combine visibilité, temps disponible et téléphone utilisable. Selon votre activité, testez l’accueil, une zone d’attente, une table, un comptoir ou la caisse. Dans un restaurant, le client peut avoir le temps de scanner à table ; dans un institut ou une boutique, le moment d’attente peut être plus adapté.",
          "Le support doit laisser respirer le QR code et son message. Indiquez une consigne courte, la nature de l’animation et les conditions essentielles. Évitez de placer le code trop bas, derrière un objet, dans un reflet ou à un endroit où le client ne peut pas garder son téléphone ouvert quelques secondes.",
          "Ces emplacements sont des scénarios à tester, pas une promesse de résultat. La meilleure place dépend de la circulation, de la lumière, de la distance de lecture et de la capacité de l’équipe à répondre aux questions.",
        ],
      },
      {
        title: "Construisez un parcours mobile en cinq étapes",
        paragraphs: [
          "1. La promesse : l’affiche explique en quelques mots pourquoi participer. 2. Le scan : le QR code ouvre la page publique du jeu dans le navigateur. 3. La participation : le client joue sur son téléphone et suit les informations affichées. 4. Le résultat : un gain éventuel est associé aux conditions et aux informations de retrait. 5. La remise : l’équipe vérifie la validité puis confirme le retrait avec le PIN de l’établissement.",
          "La prévisualisation est utile pour contrôler les textes, le formulaire et le parcours, mais elle ne doit pas être confondue avec le QR code public. Avant la diffusion, publiez le jeu puis testez le code destiné aux clients avec plusieurs smartphones, comme le ferait une personne qui ne connaît pas votre configuration.",
          "Expliquez aussi ce qui se passe en cas de perte : une participation perdue reste une participation, même sans coordonnées ; un gagnant conserve les informations utiles à son gain ; un retrait confirmé ne doit pas être remis une deuxième fois. Ces détails réduisent les incompréhensions au comptoir.",
        ],
      },
      {
        title: "Testez le QR code avant d’imprimer en quantité",
        paragraphs: [
          "Faites un test avec le support final, à la distance réelle et dans la lumière du point de vente. Vérifiez que plusieurs téléphones lisent le code, que la page s’ouvre rapidement et que le nom de l’établissement, les dates, les lots et les conditions sont corrects.",
          "Réalisez ensuite un parcours complet : scan, participation, résultat, réception des informations du gain si nécessaire et contrôle par l’équipe. Contrôlez séparément le QR de prévisualisation et le QR de participation. Une affiche bien dessinée mais reliée au mauvais lien reste un problème de diffusion.",
          "Prévoyez enfin un plan simple si le support est déplacé, si un lot arrive à épuisement ou si l’opération se termine. Une date de fin visible et des conditions à jour sont plus utiles qu’une promesse permanente que l’équipe ne peut plus honorer.",
        ],
      },
      {
        title: "Mesurez les étapes sans les confondre",
        paragraphs: [
          "Suivez séparément les scans, les participations commencées, les contacts éventuellement collectés, les gains attribués et les retraits confirmés. Un scan ne garantit pas qu’une partie a été jouée ; un gain attribué ne garantit pas qu’il a été retiré ; un clic sortant ne prouve pas un avis publié.",
          "Comparez les supports et les périodes avec prudence. Notez l’emplacement, la durée, le lot, les horaires et les changements de fréquentation. Vous pourrez ainsi identifier un support à améliorer sans attribuer automatiquement chaque vente ou chaque visite à l’animation.",
          "Le bon indicateur est celui qui correspond à votre objectif. Pour une opération de découverte, regardez d’abord les participations et les retraits. Pour une prochaine visite, suivez la validité du lot et la capacité de l’équipe à le remettre dans les conditions annoncées.",
        ],
      },
      {
        title: "Checklist avant de diffuser votre animation",
        paragraphs: [
          "Avant d’imprimer ou de partager votre support, vérifiez les points suivants :",
        ],
        items: [
          "L’objectif et l’appel à l’action tiennent en une phrase compréhensible.",
          "Le QR code public ouvre le bon jeu et non la prévisualisation.",
          "Le parcours fonctionne sur plusieurs smartphones, sans application à installer.",
          "Les lots, dates, stocks et conditions correspondent à ce que l’équipe peut remettre.",
          "Le retrait, le PIN de l’établissement et le contrôle d’un gain déjà utilisé sont compris par l’équipe.",
          "Les indicateurs à suivre sont définis avant le lancement et restent distincts des ventes attribuées.",
        ],
      },
    ],
    related: [
      "/affiches-qr-code",
      "/comment-ca-marche",
      "/restaurants",
      "/instituts-beaute",
      "/guides/placer-qr-code-jeu",
      "/guides/mesurer-jeu-qr-code",
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
