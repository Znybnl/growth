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
  {
    path: "/blog/idees-jeux-concours-restaurant",
    title: "10 idées de jeux-concours pour un restaurant",
    description:
      "Découvrez 10 idées de jeux-concours pour un restaurant : QR code à table, lots simples à remettre, heures creuses, événements et prochaine visite.",
    eyebrow: "Marketing restaurant",
    intro:
      "Un jeu-concours peut créer un moment de surprise au restaurant, remplir une période plus calme ou donner une raison de revenir. Le bon format est celui que le client comprend vite et que l’équipe peut remettre sans ralentir le service.",
    author: "L’équipe Okado",
    publishedAt: "2026-10-17",
    updatedAt: "2026-10-17",
    reviewedAt: "2026-10-17",
    readingTime: "8 min de lecture",
    ctaLabel: "Préparer une animation pour votre restaurant",
    ctaHref: "/restaurants",
    sections: [
      {
        title: "Commencez par le moment que vous voulez améliorer",
        paragraphs: [
          "Avant de choisir un jeu-concours, identifiez le moment à animer : attente avant le service, déjeuner en semaine, fin de repas, lancement d’une carte ou prochaine visite. Le même lot n’a pas le même intérêt selon l’objectif. Un dessert offert peut créer une surprise immédiate ; une remise valable plus tard peut encourager un retour.",
          "Un jeu ne garantit ni une réservation ni une hausse du chiffre d’affaires. Il peut en revanche créer un parcours mesurable : scan du QR code, participation, gain attribué, retrait et éventuelle visite suivante. Cette distinction aide à choisir un format réaliste et à interpréter les résultats sans surpromesse.",
        ],
      },
      {
        title: "10 idées de jeux-concours adaptées à un restaurant",
        paragraphs: [
          "Les idées suivantes sont des formats à adapter à votre carte, votre capacité de service et vos conditions commerciales. Elles décrivent des scénarios d’animation ; elles ne constituent pas une promesse de résultat ni une règle automatique pour votre établissement.",
        ],
        items: [
          "QR code à table : proposez une roue ou un ticket à gratter accessible depuis le téléphone pendant l’attente, avec des lots définis à l’avance.",
          "Dessert offert : faites gagner un dessert clairement identifié, avec une période de validité et les éventuelles conditions d’utilisation visibles.",
          "Animation en heure creuse : réservez le jeu ou un lot à certains créneaux de faible affluence, si l’équipe peut l’expliquer et le remettre pendant le service.",
          "Lancement d’une nouvelle carte : associez la découverte d’un plat ou d’une boisson à une participation courte, sans annoncer une disponibilité que le stock ne permet pas d’assurer.",
          "Jeu lié à un événement : créez une opération pour une soirée, une fête locale ou une date saisonnière, avec une date de fin et une dotation préparées avant la diffusion.",
          "Lot pour une prochaine visite : choisissez une récompense utilisable plus tard, avec une durée de validité, les jours concernés et les éventuelles conditions d’achat explicitement indiqués.",
          "Menu enfant : prévoyez une petite surprise ou un lot dédié, en vérifiant que la remise reste simple pour l’équipe et que la communication s’adresse correctement aux adultes accompagnants.",
          "Partenariat local : construisez une dotation avec un commerce voisin, en séparant les responsabilités, les conditions de retrait et les usages de coordonnées de chaque partenaire.",
          "Jeu saisonnier : adaptez le thème, les lots et la période à une saison ou à un produit disponible, puis retirez le support lorsque l’opération est terminée.",
          "Tirage parmi les participants : annoncez une période de participation, les modalités de sélection et la façon de prévenir ou remettre le lot, sans présenter le tirage comme une vente garantie.",
        ],
      },
      {
        title: "Choisissez des lots faciles à remettre pendant le service",
        paragraphs: [
          "Un café, une boisson sans alcool, un dessert ou un supplément peuvent être des points de départ si votre carte, vos stocks et votre marge le permettent. La bonne dotation dépend de votre coût matière et du moment où le client peut l’utiliser ; aucune idée de lot ne convient à tous les restaurants.",
          "Un lot immédiat et un lot valable lors d’une prochaine visite répondent à deux objectifs différents. Dans les deux cas, indiquez la durée de validité, les jours ou produits concernés, l’éventuel achat requis et la personne qui doit valider le retrait. Une promesse courte ne doit pas contredire les conditions détaillées.",
          "Dans Okado, l’équipe peut contrôler le gain présenté par le client, vérifier les conditions et confirmer un retrait avec le PIN de l’établissement. Le jeu ne doit pas conditionner l’accès ou le gain à un avis Google ou à une note.",
        ],
      },
      {
        title: "Adaptez le jeu à l’organisation de votre équipe",
        paragraphs: [
          "Un restaurant fonctionne avec des temps forts et des remplacements. Avant de lancer le jeu, décidez qui répond aux questions, qui vérifie le lot et qui connaît le PIN de l’établissement. Une procédure courte affichée en interne vaut mieux qu’une règle connue d’une seule personne.",
          "Testez le parcours depuis la table ou le comptoir : le QR code public doit ouvrir le bon jeu, sans application à installer ni compte joueur. Contrôlez ensuite le QR de gain et la validation du retrait. Le personnel n’a pas besoin d’un compte joueur Okado pour confirmer une remise, mais il doit connaître les conditions annoncées.",
          "Si le lot est épuisé ou si la carte change, mettez à jour le jeu et retirez les supports qui ne correspondent plus à l’offre. Une animation limitée et maîtrisée est plus fiable qu’un concours permanent que le service ne peut plus honorer.",
        ],
      },
      {
        title: "Rédigez des règles compréhensibles avant la diffusion",
        paragraphs: [
          "Expliquez qui peut participer, pendant quelle période, ce qui peut être gagné et comment le retrait se déroule. Les conditions d’achat, les jours d’exclusion, la date limite et les éventuelles limites de stock doivent être accessibles avant ou au moment de la participation.",
          "Séparez la participation, l’envoi des informations du gain et la prospection marketing. Une collecte d’e-mail peut être configurée selon le parcours, mais le consentement commercial reste distinct et facultatif. Un avis ou une note ne doit jamais devenir le prix à payer pour participer ou gagner.",
          "Pour un partenariat ou un tirage, ajoutez les informations nécessaires sur l’organisateur, la période, la sélection et le contact. Ne reprenez pas un règlement générique sans vérifier qu’il correspond réellement à votre opération et à votre pays.",
        ],
      },
      {
        title: "Mesurez les participations et les retraits séparément",
        paragraphs: [
          "Suivez les scans, les participations, les gains attribués et les retraits confirmés comme des étapes différentes. Une personne qui scanne sans jouer n’est pas une participation ; un gain attribué n’est pas forcément consommé ; une prochaine visite ne peut pas être déduite d’un seul scan.",
          "Comparez des périodes comparables en notant le créneau, le support, le lot, la durée et les changements de fréquentation. Si vous testez une opération en heure creuse, documentez aussi les horaires et les contraintes du service. Ces éléments permettent de décider quoi ajuster sans attribuer automatiquement une vente au jeu.",
          "Un résultat faible peut venir d’un QR peu visible, d’une promesse mal comprise, d’un lot indisponible ou d’une remise difficile pendant le service. Cherchez d’abord l’étape qui bloque avant de modifier toute la dotation.",
        ],
      },
      {
        title: "Checklist avant de lancer votre jeu-concours",
        paragraphs: [
          "Avant d’imprimer une affiche ou de placer un QR code sur les tables, vérifiez :",
        ],
        items: [
          "L’objectif est formulé en une phrase : animer l’attente, faire découvrir une nouveauté ou encourager une prochaine visite.",
          "Le QR code public ouvre le bon jeu publié et a été testé sur plusieurs smartphones.",
          "Les lots, stocks, dates de validité et conditions correspondent à votre carte et à votre capacité de service.",
          "L’équipe sait reconnaître un gain, vérifier ses conditions et confirmer un retrait unique avec le PIN de l’établissement.",
          "La participation ne dépend ni d’un avis Google ni d’une note, et le consentement marketing reste séparé.",
          "Les indicateurs de suivi sont définis avant le lancement et ne sont pas présentés comme une preuve de ventes causées.",
        ],
      },
    ],
    related: [
      "/restaurants",
      "/guides/lots-restaurant",
      "/affiches-qr-code",
      "/guides/mesurer-jeu-qr-code",
    ],
    source: [
      {
        label: "Google Search Central — contenu utile",
        href: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
      },
    ],
  },
  {
    path: "/blog/animation-commerciale-institut-beaute",
    title: "Animation commerciale pour institut de beauté : idées et exemples",
    description:
      "Découvrez 10 idées d’animation commerciale pour un institut de beauté, un spa ou un salon : soins, prochaine visite, lancement, lots et calendrier.",
    eyebrow: "Marketing beauté",
    intro:
      "Une animation commerciale peut créer un temps fort dans un institut de beauté sans banaliser l’expérience. Le format doit rester cohérent avec votre univers, vos prestations et le temps réellement disponible pour votre équipe.",
    author: "L’équipe Okado",
    publishedAt: "2026-10-17",
    updatedAt: "2026-10-17",
    reviewedAt: "2026-10-17",
    readingTime: "8 min de lecture",
    ctaLabel: "Imaginer une animation à votre image",
    ctaHref: "/instituts-beaute",
    sections: [
      {
        title: "Définissez l’objectif de votre animation",
        paragraphs: [
          "Un institut peut vouloir faire découvrir un soin, présenter un nouveau protocole, valoriser une gamme ou donner envie de revenir. Ces objectifs ne demandent pas forcément le même lot ni le même moment de diffusion. Commencez par une intention principale pour préserver la lisibilité de l’expérience.",
          "Une animation ne garantit ni réservation, ni chiffre d’affaires, ni fidélisation. Elle peut en revanche créer un parcours observable : participation, gain, retrait et éventuelle prochaine visite. Cette distinction protège votre image premium et vous aide à mesurer ce qui s’est réellement passé.",
        ],
      },
      {
        title: "10 idées d’animations commerciales pour un institut de beauté",
        paragraphs: [
          "Les idées ci-dessous sont des scénarios à adapter à votre positionnement, vos prestations, vos stocks et votre planning. Les exemples de lots et de coûts sont hypothétiques : validez-les avec votre réalité avant toute diffusion.",
        ],
        items: [
          "Découverte d’un soin : faites gagner une option courte ou un avantage lié à une prestation que votre équipe peut réellement expliquer et délivrer.",
          "Prochaine visite : proposez un lot valable sur un rendez-vous ultérieur, avec une date limite réaliste et les éventuelles conditions d’utilisation visibles.",
          "Lancement d’un protocole : accompagnez la présentation d’un nouveau rituel ou d’une nouvelle gamme avec une expérience découverte, sans promettre une disponibilité illimitée.",
          "Partenariat local : imaginez une dotation commune avec un salon, une boutique ou un commerce voisin, en clarifiant qui organise, qui remet et qui protège les coordonnées.",
          "Événement client : utilisez une roue ou un ticket à gratter pendant une soirée, une journée découverte ou une présentation, avec une dotation préparée pour le volume attendu.",
          "Roue élégante : choisissez une roue mobile avec un message court, un logo et des lots cohérents avec votre identité, plutôt qu’une mécanique trop promotionnelle pour votre clientèle.",
          "Ticket surprise : proposez une révélation tactile sur smartphone pour une opération de découverte, en conservant des conditions lisibles avant et après la participation.",
          "Offre duo : construisez un avantage pour une prestation ou une découverte à deux, sans transformer le jeu en promesse automatique de réservation.",
          "Invitation parrainage : préparez une offre de recommandation gérée par votre équipe, avec des règles explicites ; le jeu ne remplace pas un programme de parrainage automatisé.",
          "Temps fort saisonnier : adaptez le thème, le support et la durée à une période de l’année, puis retirez les affiches et les lots lorsque l’opération est terminée.",
        ],
      },
      {
        title: "Choisissez des lots cohérents avec votre univers",
        paragraphs: [
          "Un lot peut être une option de soin, un mini-produit, une décoration, un complément de prestation ou un avantage valable lors d’une prochaine visite. Ce sont des pistes, pas des recommandations universelles : vérifiez votre coût, votre marge, vos stocks et le temps nécessaire à la remise.",
          "Une prestation offerte sans achat n’a pas le même coût qu’une option ajoutée à un rendez-vous existant. Écrivez la condition au moment de configurer le lot et vérifiez que le texte court de la roue ou du ticket ne contredit pas le coupon détaillé.",
          "Dans Okado, vous pouvez choisir une roue ou un ticket à gratter, personnaliser les textes et le logo selon le modèle, puis définir les lots, probabilités, stocks et conditions. La responsabilité du choix de la dotation et de sa capacité de délivrance reste celle de l’institut.",
        ],
      },
      {
        title: "Construisez un calendrier qui respecte votre planning",
        paragraphs: [
          "Une animation peut accompagner le lancement d’un protocole, une journée découverte, une saison ou une période où vous avez le temps de répondre aux participantes. Évitez de multiplier les opérations sans prévoir qui remet les gains et combien de temps ils restent valables.",
          "Préparez le support, les lots, les dates et la procédure avant la diffusion. Si une prestation nécessite un rendez-vous ou une disponibilité particulière, laissez un délai réaliste. Lorsque l’opération se termine ou qu’un lot n’est plus disponible, retirez les supports et mettez à jour le jeu.",
          "Le calendrier est un outil d’organisation, pas une promesse de remplissage. Comparez les opérations dans leur contexte en notant la période, le support, les prestations concernées et les changements de planning.",
        ],
      },
      {
        title: "Préservez l’expérience en point de vente",
        paragraphs: [
          "Le QR code peut être placé à l’accueil, dans une zone d’attente ou sur un support remis après la prestation. Le message doit rester court, lisible et aligné avec le ton de l’institut. Testez le support imprimé dans la lumière réelle et à la distance où il sera consulté.",
          "La roue et le ticket fonctionnent dans le navigateur du téléphone, sans application ni compte joueur à créer. Distinguez le QR de prévisualisation du QR public de participation, puis faites un parcours complet avant de le présenter à vos clientes.",
          "Une invitation à laisser un avis reste indépendante du jeu. Ni la participation ni le gain ne doivent être échangés contre un avis Google ou une note. De même, une collecte de contacts et la prospection marketing doivent rester clairement distinctes.",
        ],
      },
      {
        title: "Mesurez l’intérêt sans dégrader la promesse",
        paragraphs: [
          "Suivez séparément les scans, les participations, les gains attribués et les retraits confirmés. Un scan ne prouve pas une participation ; un gain n’est pas toujours retiré ; un retrait ne prouve pas une réservation ou un chiffre d’affaires causé par l’animation.",
          "Si l’opération vise la découverte d’un soin, observez les participations et les retraits associés à la dotation. Si elle vise une prochaine visite, regardez les conditions de validité et la capacité de l’équipe à remettre le lot. Ne tirez pas de conclusion générale à partir d’un seul événement.",
          "Un résultat décevant peut venir d’un support peu visible, d’un lot mal compris, d’une période trop courte ou d’une condition difficile à appliquer. Analysez l’étape qui bloque avant de changer tout le positionnement de l’institut.",
        ],
      },
      {
        title: "Checklist avant de lancer l’opération",
        paragraphs: [
          "Avant de diffuser votre animation, vérifiez :",
        ],
        items: [
          "L’objectif, le ton et le lot sont cohérents avec votre positionnement.",
          "Le QR code public ouvre le bon jeu publié et non une prévisualisation.",
          "Les textes, dates, stocks, probabilités et conditions ont été relus par l’équipe.",
          "Le support a été testé sur smartphone, dans la zone d’accueil ou d’attente réelle.",
          "Une personne sait expliquer le gain, vérifier sa validité et confirmer un retrait unique.",
          "L’animation ne conditionne ni le gain ni la participation à un avis Google, et les indicateurs sont définis avant le lancement.",
        ],
      },
    ],
    related: [
      "/instituts-beaute",
      "/guides/lots-institut-beaute",
      "/ticket-a-gratter",
      "/roue-de-la-fortune",
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
