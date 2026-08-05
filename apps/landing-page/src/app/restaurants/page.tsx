import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  Clock3,
  Gift,
  Mail,
  MapPin,
  MessageSquareText,
  QrCode,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  Trophy,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import { LandingDemo } from "@/components/marketing/landing-demo";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.okado.app";

export const metadata: Metadata = {
  title: "Jeu QR code restaurant pour avis Google et fidélisation | Okado",
  description:
    "Okado aide les restaurants à obtenir plus d'avis Google, collecter des e-mails clients et déclencher des retours en salle avec un jeu QR code simple à installer.",
  keywords: [
    "jeu concours restaurant",
    "QR code restaurant",
    "avis Google restaurant",
    "fidélisation restaurant",
    "animation restaurant",
    "marketing restaurant local",
    "faire revenir clients restaurant",
    "collecte email restaurant",
    "roue de la fortune restaurant",
    "ticket à gratter restaurant",
    "jeu QR code avis Google",
  ],
  alternates: {
    canonical: "https://okado.app/restaurants",
  },
  openGraph: {
    title: "Okado Restaurants | Plus d'avis Google, de contacts clients et de retours",
    description:
      "Transformez vos clients en salle en avis Google, contacts qualifiés et prochaines visites grâce à une animation QR code ludique.",
    url: "https://okado.app/restaurants",
    siteName: "Okado",
    images: [
      {
        url: "https://okado.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Okado pour restaurants avec jeu QR code et roue de la fortune",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
};

type IconCard = {
  icon: LucideIcon;
  title: string;
  text: string;
};

const painPoints: IconCard[] = [
  {
    icon: MessageSquareText,
    title: "Les avis Google ne viennent pas seuls",
    text: "Même lorsqu'un client est satisfait, il repart souvent sans laisser d'avis. L'équipe n'a pas toujours le bon moment ni le bon support pour le demander.",
  },
  {
    icon: Mail,
    title: "Les clients restent anonymes",
    text: "Sans e-mail ou prénom, impossible de relancer les clients de passage, de mesurer le retour en restaurant ou de créer une base locale activable.",
  },
  {
    icon: RefreshCw,
    title: "La revisite n'est pas pilotée",
    text: "Un bon repas ne suffit pas toujours à déclencher une prochaine visite. Il faut donner une raison simple, datée et mesurable de revenir.",
  },
];

const marketProofs = [
  {
    stat: "97%",
    label: "des consommateurs lisent des avis pour les entreprises locales.",
    source: "BrightLocal, Local SEO Statistics 2026",
    href: "https://www.brightlocal.com/resources/local-seo-statistics/",
  },
  {
    stat: "71%",
    label: "utilisent Google pour lire des avis locaux.",
    source: "BrightLocal, Local Consumer Review Survey",
    href: "https://www.brightlocal.com/research/local-consumer-review-survey/",
  },
  {
    stat: "47%",
    label: "des membres de programmes de fidélité restaurant les utilisent plusieurs fois par mois.",
    source: "Deloitte, Restaurant Loyalty Programs",
    href: "https://www.deloitte.com/us/en/industries/consumer/articles/restaurant-loyalty-program.html",
  },
  {
    stat: "+5%",
    label: "de rétention client peut fortement améliorer la rentabilité.",
    source: "Harvard Business Review / Bain",
    href: "https://hbr.org/2014/10/the-value-of-keeping-the-right-customers",
  },
];

const pilotSimulation = [
  {
    icon: QrCode,
    value: "200",
    label: "scans en salle",
    detail: "affiche, chevalet, ticket ou comptoir",
  },
  {
    icon: Trophy,
    value: "140",
    label: "participations",
    detail: "clients qui entrent dans le parcours",
  },
  {
    icon: Mail,
    value: "70",
    label: "contacts clients",
    detail: "prénom et e-mail exploitables",
  },
  {
    icon: Ticket,
    value: "20",
    label: "coupons présentés",
    detail: "retours mesurables en restaurant",
  },
];

const conversionObjections = [
  {
    question: "Est-ce que mon équipe devra expliquer le jeu ?",
    answer:
      "Non. Le parcours est pensé pour être compris seul : le client scanne, réalise l'action demandée, joue, puis reçoit son coupon par e-mail.",
  },
  {
    question: "Est-ce que les lots vont coûter trop cher ?",
    answer:
      "Vous choisissez des lots compatibles avec votre marge : café, topping, dessert, boisson, remise limitée ou avantage valable uniquement lors d'une prochaine visite.",
  },
  {
    question: "Est-ce autorisé pour les avis Google ?",
    answer:
      "Okado ne conditionne pas le gain à un avis positif. L'avis peut faire partie du parcours, mais la mécanique de jeu reste indépendante.",
  },
  {
    question: "Est-ce que je garde mes données clients ?",
    answer:
      "Oui. Les contacts collectés appartiennent au restaurant. Okado fournit l'outil de collecte, de suivi et d'export.",
  },
];

const steps: IconCard[] = [
  {
    icon: QrCode,
    title: "1. Le client scanne",
    text: "Sur table, comptoir, vitrine, ticket de caisse ou sac à emporter. Aucune application à installer.",
  },
  {
    icon: Star,
    title: "2. Il réalise une action",
    text: "Avis Google, Instagram, TikTok, Tripadvisor, collecte e-mail ou lien personnalisé.",
  },
  {
    icon: Trophy,
    title: "3. Il joue",
    text: "Roue de la fortune ou ticket à gratter, avec vos couleurs, votre logo et vos lots.",
  },
  {
    icon: BadgeCheck,
    title: "4. Il revient récupérer",
    text: "Le coupon est envoyé par e-mail avec QR code unique, puis validé une seule fois par votre équipe.",
  },
];

const useCases = [
  {
    label: "Brasserie",
    title: "Déclencher une revisite dès le lendemain",
    text: "Un café, un dessert ou une boisson à récupérer lors de la prochaine visite, avec validité limitée.",
  },
  {
    label: "Pizzeria",
    title: "Transformer une commande en prochaine commande",
    text: "Topping, dessert, boisson ou remise sur place, utile en salle comme en click & collect.",
  },
  {
    label: "Restauration rapide",
    title: "Animer les files d'attente et les passages au comptoir",
    text: "Une mécanique courte, visible, facile à comprendre et adaptée aux flux rapides.",
  },
  {
    label: "Bar à tapas",
    title: "Créer un rituel autour de l'happy hour",
    text: "Lots disponibles sur une plage horaire choisie pour lisser la fréquentation.",
  },
  {
    label: "Glacier",
    title: "Faire revenir après une première visite plaisir",
    text: "Topping offert, petit format, deuxième boule ou surprise à récupérer sous quelques jours.",
  },
  {
    label: "Boulangerie",
    title: "Faire revenir le matin ou le midi",
    text: "Viennoiserie, café ou formule découverte pour transformer un passage ponctuel en habitude.",
  },
];

const reviewStrategy = [
  "Demander l'avis au bon moment : juste après l'expérience, en salle ou au comptoir.",
  "Ne jamais conditionner un lot à un avis positif : l'action doit rester authentique.",
  "Utiliser un lien Google direct pour réduire les frictions.",
  "Alterner les objectifs : première participation avis Google, seconde collecte e-mail, troisième réseau social.",
  "Mesurer le nombre de scans, clics et participations pour comprendre où placer vos QR codes.",
];

const returnStrategy = [
  {
    title: "Lot différé",
    text: "Rendez le cadeau disponible demain ou dans 24h pour favoriser une vraie prochaine visite.",
  },
  {
    title: "Validité courte",
    text: "7 à 14 jours est souvent suffisant pour créer un sentiment d'urgence sans frustrer le client.",
  },
  {
    title: "Retrait sur place",
    text: "Le QR code de gain doit être présenté au personnel, ce qui permet un contact réel avec l'équipe.",
  },
  {
    title: "Stock maîtrisé",
    text: "Définissez des quantités limitées ou illimitées selon la valeur du lot et votre marge.",
  },
];

const trustItems: IconCard[] = [
  {
    icon: ShieldCheck,
    title: "Vos données restent les vôtres",
    text: "Les contacts collectés appartiennent au restaurateur. Okado fournit l'outil de collecte, d'export et de suivi, sans exploiter vos fichiers clients pour son propre marketing.",
  },
  {
    icon: BadgeCheck,
    title: "Pensé pour un usage RGPD",
    text: "Le parcours permet d'afficher les mentions nécessaires, de recueillir les consentements utiles et d'exporter les données pour votre gestion marketing.",
  },
  {
    icon: MapPin,
    title: "Données hébergées en Union européenne",
    text: "L'infrastructure Supabase utilisée par l'application est configurée en Europe, avec un hébergement en Irlande pour limiter les frictions de conformité.",
  },
];

const posterBenefits: IconCard[] = [
  {
    icon: QrCode,
    title: "Affiche A4 générée automatiquement",
    text: "Logo, texte, QR code, roue ou ticket : l'outil génère une affiche prête à imprimer depuis votre campagne.",
  },
  {
    icon: Sparkles,
    title: "Aucune équipe créa nécessaire",
    text: "Vous n'avez pas besoin de passer des heures sur Canva ou d'attendre un graphiste pour lancer votre première animation.",
  },
  {
    icon: ReceiptText,
    title: "QR code réutilisable partout",
    text: "Vous pouvez aussi télécharger uniquement le QR code pour l'ajouter sur un menu, un chevalet, un ticket ou un support existant.",
  },
];

const prizes = [
  {
    group: "Lots à faible coût",
    examples: ["Café offert", "Topping", "Cookie", "Viennoiserie", "Boisson soft", "Sauce premium"],
  },
  {
    group: "Lots conversion",
    examples: ["Dessert offert", "Apéritif", "Entrée", "Remise 5 €", "Upgrade menu", "Formule découverte"],
  },
  {
    group: "Lots premium",
    examples: ["Menu offert", "Brunch pour deux", "Bon d'achat 20 €", "Dégustation", "Invitation soirée"],
  },
  {
    group: "Lots sans coût direct",
    examples: ["Priorité réservation", "Surprise chef", "Accès avant-première", "Recette exclusive"],
  },
];

const placementIdeas = [
  "Chevalet de table",
  "Affiche à la caisse",
  "Sticker vitrine",
  "Ticket de caisse",
  "Menu papier",
  "Sac à emporter",
  "Flyer livraison",
  "Écran comptoir",
];

const implementationPlan = [
  {
    day: "Jour 1",
    title: "Créer l'animation",
    text: "Nommez votre campagne, choisissez roue ou ticket à gratter, ajoutez votre logo, votre message et votre action marketing.",
  },
  {
    day: "Jour 1",
    title: "Configurer les dotations",
    text: "Ajoutez vos lots, stocks, probabilités, délais de disponibilité et conditions d'utilisation.",
  },
  {
    day: "Jour 1",
    title: "Imprimer l'affiche QR code",
    text: "Téléchargez l'affiche A4 ou le QR code seul pour l'intégrer dans un menu, un chevalet ou une création Canva.",
  },
  {
    day: "Semaine 1",
    title: "Observer les données",
    text: "Suivez les scans, contacts clients, lots gagnés et lots retirés pour identifier les meilleurs emplacements.",
  },
  {
    day: "Semaine 2",
    title: "Optimiser",
    text: "Ajustez les lots, le délai de retrait et l'action marketing selon vos résultats.",
  },
];

const comparisonRows = [
  ["Demande orale d'avis", "Simple", "Peu mesurable", "Dépend de l'équipe"],
  ["Carte fidélité papier", "Connue", "Peu de données", "Perte fréquente"],
  ["Jeu Instagram", "Viral", "Hors restaurant", "Peu adapté au retrait immédiat"],
  ["CRM classique", "Puissant", "Long à déployer", "Pas pensé pour le scan en salle"],
  ["Okado", "QR code + jeu + e-mail + retrait unique", "Mesurable", "Pensé pour le terrain"],
];

const faqs = [
  {
    question: "Comment obtenir plus d'avis Google pour un restaurant ?",
    answer:
      "Le plus efficace est de demander au bon moment, avec un lien direct et une expérience simple. Okado place cette demande dans un parcours QR code ludique, sans conditionner le gain à un avis positif.",
  },
  {
    question: "Peut-on offrir un cadeau contre un avis Google ?",
    answer:
      "Il faut rester prudent : le cadeau ne doit pas acheter un avis positif. Okado permet d'intégrer une action avis Google dans un parcours plus large, tout en gardant une mécanique de jeu indépendante.",
  },
  {
    question: "Quel lot proposer dans un restaurant ?",
    answer:
      "Privilégiez un lot simple, compréhensible et maîtrisé en marge : café, dessert, boisson, topping, remise limitée ou cadeau valable lors de la prochaine visite.",
  },
  {
    question: "Comment éviter qu'un coupon soit utilisé plusieurs fois ?",
    answer:
      "Chaque gain génère un QR code unique. Le personnel le scanne lors du retrait, puis le lot passe au statut récupéré et ne peut plus être consommé une seconde fois.",
  },
  {
    question: "Est-ce adapté aux restaurants avec beaucoup de passage ?",
    answer:
      "Oui. Le parcours est conçu pour être compris en quelques secondes : scan, action, jeu, e-mail de gain, retrait en restaurant.",
  },
  {
    question: "Est-ce compatible RGPD ?",
    answer:
      "Okado fournit l'infrastructure de collecte et d'export. Le restaurateur reste responsable de ses mentions et de l'usage de ses données clients.",
  },
  {
    question: "À qui appartiennent les données collectées ?",
    answer:
      "Les contacts collectés appartiennent au restaurateur qui organise l'animation. Okado fournit l'outil technique pour collecter, suivre et exporter ces données.",
  },
  {
    question: "Où sont hébergées les données ?",
    answer:
      "L'application s'appuie sur Supabase avec une infrastructure configurée en Europe, notamment en Irlande, afin de rester cohérente avec les attentes des clients européens.",
  },
  {
    question: "Faut-il créer soi-même les affiches ?",
    answer:
      "Non. Okado génère une affiche A4 avec QR code, logo, texte et visuel de jeu. Vous pouvez aussi télécharger le QR code seul pour l'ajouter sur vos propres supports.",
  },
];

function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="Retour à l'accueil Okado">
      <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-[#6c00f6] text-white shadow-[0_0_24px_rgba(108,0,246,0.20)]">
        <Star className="h-5 w-5 fill-white text-white" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[17px] font-bold tracking-[-0.03em] text-[#0f172b]">Okado</span>
        <span className="mt-1 text-[11px] font-medium text-[#90a1b9]">restaurants</span>
      </span>
    </Link>
  );
}

function PrimaryButton({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#6c00f6] px-5 py-3 text-[15px] font-semibold !text-white shadow-[0_16px_36px_rgba(108,0,246,0.24)] transition hover:-translate-y-0.5 hover:bg-[#5700ce]"
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function SectionTitle({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <span className="rounded-[4px] bg-[#6c00f6]/10 px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#6c00f6]">
        {eyebrow}
      </span>
      <h2 className="mt-5 text-3xl font-black leading-[1.08] tracking-[-0.055em] text-[#0f172b] md:text-[46px]">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-[#475569] md:text-lg">{text}</p>
    </div>
  );
}

function QrIllustration({ className = "" }: { className?: string }) {
  const activeCells = new Set([
    "4-0",
    "6-0",
    "4-1",
    "8-1",
    "3-2",
    "5-2",
    "7-2",
    "4-3",
    "8-3",
    "3-4",
    "5-4",
    "6-4",
    "1-5",
    "4-5",
    "7-5",
    "5-6",
    "8-6",
    "3-7",
    "4-7",
    "6-7",
    "8-7",
    "4-8",
    "6-8",
  ]);

  return (
    <div
      className={`grid aspect-square grid-cols-9 gap-[3px] rounded-[16px] border border-[#e5e7eb] bg-white p-3 shadow-[0_14px_35px_rgba(15,23,43,0.12)] ${className}`}
      aria-label="Illustration de QR code"
    >
      {Array.from({ length: 81 }).map((_, index) => {
        const x = index % 9;
        const y = Math.floor(index / 9);
        const topLeftFinder = x <= 2 && y <= 2;
        const topRightFinder = x >= 6 && y <= 2;
        const bottomLeftFinder = x <= 2 && y >= 6;
        const finder = topLeftFinder || topRightFinder || bottomLeftFinder;
        const center =
          (x === 1 && y === 1) || (x === 7 && y === 1) || (x === 1 && y === 7);
        const finderBorder = finder && !center;
        const active = finderBorder || activeCells.has(`${x}-${y}`);

        return (
          <span
            key={`${x}-${y}`}
            className={`rounded-[2px] ${active ? "bg-[#0f172b]" : "bg-transparent"}`}
          />
        );
      })}
    </div>
  );
}

function RestaurantQrPhotoVisual() {
  return (
    <div className="relative min-h-[330px] overflow-hidden rounded-[24px] border border-[#e5e7eb] bg-[#31190b] shadow-[0_24px_70px_rgba(49,25,11,0.18)] sm:col-span-2">
      <Image
        src="/images/restaurant-a5-counter.png"
        alt="Affiche A5 Okado positionnée sur un comptoir de restaurant"
        fill
        sizes="(min-width: 768px) 58vw, 100vw"
        className="object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(15,23,43,0.78))] p-5 text-white">
        <p className="text-lg font-black tracking-[-0.04em]">
          Une mise en place visible en salle
        </p>
        <p className="mt-1 max-w-md text-sm leading-6 text-white/78">
          Table, caisse, vitrine ou ticket : le support QR doit se voir sans gêner le service.
        </p>
      </div>
    </div>
  );
}

function MiniWheel() {
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function RestaurantTableVisual() {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-[#e5e7eb] bg-[radial-gradient(circle_at_top_left,#ffe8c7_0%,#fffaf4_38%,#ffffff_100%)] p-5 sm:col-span-2">
      <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[#145aff]/10" />
      <div className="grid gap-4 sm:grid-cols-[0.85fr_1.15fr] sm:items-center">
        <div className="rounded-[22px] bg-white p-5 shadow-[0_16px_45px_rgba(49,25,11,0.12)]">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#31190b]">
            Chevalet de table
          </p>
          <div className="mt-4 flex items-center gap-4">
            <QrIllustration className="h-24 w-24" />
            <div>
              <p className="text-lg font-black tracking-[-0.04em] text-[#0f172b]">
                Scannez pour jouer
              </p>
              <p className="mt-2 text-sm leading-6 text-[#64748b]">
                Le client comprend l&apos;action sans explication de l&apos;équipe.
              </p>
            </div>
          </div>
        </div>
        <div className="relative mx-auto h-56 w-40 overflow-hidden rounded-[28px] border-[8px] border-[#0f172b] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,43,0.18)]">
          <p className="text-center text-sm font-black tracking-[-0.03em] text-[#0f172b]">
            Le bistro
          </p>
          <div className="mx-auto mt-5 h-28 w-28">
            <MiniWheel />
          </div>
          <button
            type="button"
            className="mx-auto mt-5 block rounded-[10px] bg-[#145aff] px-5 py-2 text-xs font-black text-white"
          >
            JOUER
          </button>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PosterSectionVisual() {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-[#f0dfcf] bg-[linear-gradient(135deg,#fffaf4_0%,#ffffff_58%,#eef4ff_100%)] p-6 shadow-[0_24px_80px_rgba(49,25,11,0.10)] md:p-8">
      <div className="absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-[#d6a51f]/18 blur-2xl" />
      <div className="relative grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6c00f6]">
            Support prêt à imprimer
          </p>
          <h3 className="mt-4 max-w-lg text-3xl font-black leading-[1.05] tracking-[-0.055em] text-[#0f172b] md:text-[44px]">
            Une affiche QR propre, cohérente avec votre jeu.
          </h3>
          <p className="mt-4 max-w-xl leading-8 text-[#64748b]">
            Le QR code est lisible, le visuel de jeu est identifiable et les trois étapes restent
            compréhensibles depuis une table, une vitrine ou un comptoir.
          </p>
        </div>
        <div className="relative mx-auto aspect-[4/5] w-full max-w-[360px] rounded-[28px] border border-[#e5e7eb] bg-white p-5 shadow-[0_22px_60px_rgba(15,23,43,0.16)]">
          <p className="text-center text-xs font-black uppercase tracking-[0.18em] text-[#6c00f6]">
            Votre logo
          </p>
          <p className="mx-auto mt-4 max-w-[220px] text-center text-3xl font-black uppercase italic leading-[0.95] tracking-[-0.05em] text-[#0f172b]">
            Faites tourner la roue
          </p>
          <div className="absolute bottom-24 left-[-40px] h-48 w-48">
            <MiniWheel />
          </div>
          <div className="absolute right-6 top-[43%] rounded-[22px] border-[8px] border-[#145aff] bg-white p-3 shadow-[0_18px_38px_rgba(15,23,43,0.18)]">
            <QrIllustration className="h-28 w-28 border-0 p-1 shadow-none" />
            <div className="mt-3 rounded-[12px] bg-[#145aff] px-4 py-2 text-center text-xs font-black uppercase text-white">
              Scannez pour jouer
            </div>
          </div>
          <div className="absolute inset-x-5 bottom-5 grid grid-cols-3 rounded-[18px] border border-[#f0dfcf] bg-white/92 p-3 text-center text-xs font-black text-[#31190b] shadow-[0_12px_30px_rgba(49,25,11,0.08)]">
            <span>1 Scan</span>
            <span>2 Joue</span>
            <span>3 Gagne</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function JsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "Okado Restaurants",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "20",
          priceCurrency: "EUR",
          description: "Abonnement mensuel Okado Pro pour restaurants",
        },
        description:
          "Solution SaaS de jeu QR code pour restaurants, avis Google, collecte e-mail, affiches et retrait sécurisé de lots.",
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
      {
        "@type": "HowTo",
        name: "Mettre en place un jeu QR code dans un restaurant",
        step: implementationPlan.map((item, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: item.title,
          text: item.text,
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default function RestaurantsPage() {
  return (
    <main className="min-h-screen bg-[#fffaf4] font-sans text-[#0f172b]">
      <JsonLd />

      <div className="border-b border-[#f0dfcf] bg-[#31190b] px-4 py-2 text-center text-sm font-semibold text-white">
        30 jours d&apos;essai gratuit pour lancer votre première animation restaurant.
      </div>

      <header className="sticky top-0 z-30 border-b border-[#f0dfcf] bg-[#fffaf4]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-5">
          <BrandMark />
          <nav className="hidden items-center gap-7 text-sm font-semibold text-[#31190b] md:flex">
            <a href="#avis-google" className="hover:text-[#6c00f6]">
              Avis Google
            </a>
            <a href="#roi" className="hover:text-[#6c00f6]">
              ROI
            </a>
            <a href="#lots" className="hover:text-[#6c00f6]">
              Lots
            </a>
            <a href="#faq" className="hover:text-[#6c00f6]">
              FAQ
            </a>
          </nav>
          <PrimaryButton href={`${APP_URL}/inscription`}>Essayer gratuitement</PrimaryButton>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[#f0dfcf]">
        <div className="absolute left-[-8rem] top-16 h-96 w-96 rounded-full bg-[#ffb86b]/30 blur-3xl" />
        <div className="absolute right-[-10rem] top-0 h-[34rem] w-[34rem] rounded-full bg-[#6c00f6]/12 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,transparent,#fffaf4)]" />

        <div className="relative mx-auto max-w-[1200px] px-5 py-16 text-center md:py-24">
          <div className="mx-auto max-w-5xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#f0dfcf] bg-white px-3 py-1.5 text-sm font-semibold text-[#6c00f6] shadow-[0_12px_30px_rgba(49,25,11,0.08)]">
              <Utensils className="h-4 w-4" />
              Marketing terrain pour restaurants
            </span>
            <h1 className="mx-auto mt-7 max-w-4xl text-[42px] font-black leading-[1.03] tracking-[-0.06em] text-[#0f172b] md:text-[64px]">
              Transformez chaque table en avis Google, et fidélisez vos clients
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#475569]">
              Okado installe une animation QR code simple dans votre restaurant : le client scanne,
              réalise une action marketing, joue, reçoit son coupon par e-mail et revient le présenter
              à votre équipe.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <PrimaryButton href={`${APP_URL}/inscription`}>Créer mon animation restaurant</PrimaryButton>
              <Link
                href="#demo"
                className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#e4d4c3] bg-white px-5 py-3 text-[15px] font-semibold text-[#31190b] shadow-[0_12px_30px_rgba(49,25,11,0.08)] transition hover:-translate-y-0.5"
              >
                Voir le parcours client
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
              {["30 jours d'essai", "Affiche QR incluse", "Retrait sécurisé"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm font-semibold text-[#31190b]">
                  <Check className="h-4 w-4 text-[#16a34a]" />
                  {item}
                </div>
              ))}
            </div>
            <div className="hidden">
              {[
                ["Avis Google", "Demandez au bon moment, avec un lien direct."],
                ["Contacts clients", "Collectez prénom et e-mail sans friction."],
                ["Retours mesurés", "Suivez les coupons récupérés en restaurant."],
              ].map(([title, text]) => (
                <div key={title} className="rounded-[18px] bg-[#fffaf4] p-4">
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-[#6c00f6]">
                    {title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#475569]">{text}</p>
                </div>
              ))}
            </div>
          </div>
          <div id="demo" className="mt-12">
            <LandingDemo />
          </div>
        </div>
      </section>

      <section className="hidden">
        <div className="grid gap-5 rounded-[32px] border border-[#f0dfcf] bg-white p-6 shadow-[0_24px_80px_rgba(49,25,11,0.08)] md:grid-cols-[0.85fr_1.15fr] md:p-8">
          <div>
            <span className="rounded-[4px] bg-[#6c00f6]/10 px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#6c00f6]">
              Simulation pilote
            </span>
            <h2 className="mt-5 text-3xl font-black leading-[1.08] tracking-[-0.055em] md:text-[44px]">
              Une animation test doit prouver qu&apos;elle crée des retours.
            </h2>
            <p className="mt-4 leading-8 text-[#475569]">
              Sur un premier mois, l&apos;objectif n&apos;est pas de deviner : c&apos;est de mesurer combien
              de clients scannent, jouent, laissent leurs coordonnées et reviennent avec leur coupon.
            </p>
            <div className="mt-6">
              <PrimaryButton href={`${APP_URL}/inscription`}>Lancer un test 30 jours</PrimaryButton>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {pilotSimulation.map((item) => (
              <div key={item.label} className="rounded-[22px] bg-[#fffaf4] p-5">
                <p className="text-5xl font-black tracking-[-0.07em] text-[#6c00f6]">{item.value}</p>
                <p className="mt-2 text-base font-black tracking-[-0.03em] text-[#0f172b]">
                  {item.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#64748b]">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 py-18 md:py-24">
        <SectionTitle
          eyebrow="Le problème"
          title="Vos clients passent, mangent, apprécient... puis disparaissent."
          text="La restauration vit sur le flux, la réputation locale et la répétition. Le défi n'est pas seulement de servir un bon repas : c'est de transformer ce moment en relation mesurable."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {painPoints.map((item) => (
            <article
              key={item.title}
              className="rounded-[24px] border border-[#f0dfcf] bg-white p-6 shadow-[0_22px_60px_rgba(49,25,11,0.08)]"
            >
              <item.icon className="h-8 w-8 text-[#6c00f6]" />
              <h3 className="mt-5 text-xl font-black tracking-[-0.04em] text-[#0f172b]">
                {item.title}
              </h3>
              <p className="mt-3 leading-7 text-[#64748b]">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white px-5 py-18 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <SectionTitle
            eyebrow="Pourquoi maintenant"
            title="Les avis, la fidélité et la donnée client sont devenus des actifs restaurant."
            text="Les restaurateurs qui progressent localement ne comptent plus uniquement sur le bouche-à-oreille. Ils structurent la preuve sociale, la relation client et la revisite."
          />
          <div className="mt-12 grid gap-4 md:grid-cols-4">
            {marketProofs.map((proof) => (
              <a
                key={proof.stat}
                href={proof.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-[24px] border border-[#e5e7eb] bg-[#f8fafc] p-6 transition hover:-translate-y-1 hover:border-[#6c00f6]/30"
              >
                <p className="text-5xl font-black tracking-[-0.07em] text-[#6c00f6]">
                  {proof.stat}
                </p>
                <p className="mt-4 text-sm leading-6 text-[#334155]">{proof.label}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
                  {proof.source}
                </p>
              </a>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <PrimaryButton href={`${APP_URL}/inscription`}>
              Tester l&apos;animation dans mon restaurant
            </PrimaryButton>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 py-18 md:py-24">
        <SectionTitle
          eyebrow="Parcours client"
          title="Une mécanique simple pour la salle, le comptoir et l'emporté."
          text="Okado est pensé pour le terrain : aucun téléchargement, une affiche lisible, une action marketing claire, un jeu mobile et un retrait contrôlé par QR code."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-4">
          {steps.map((item) => (
            <article key={item.title} className="rounded-[24px] border border-[#f0dfcf] bg-white p-6">
              <item.icon className="h-8 w-8 text-[#d6a51f]" />
              <h3 className="mt-5 text-lg font-black tracking-[-0.04em]">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#64748b]">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#31190b] px-5 py-18 text-white md:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-10 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <span className="rounded-[4px] bg-white/10 px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#ffddb4]">
              Cas d&apos;usage
            </span>
            <h2 className="mt-5 text-4xl font-black leading-[1.06] tracking-[-0.055em] md:text-5xl">
              Des scénarios adaptés à chaque type de restaurant.
            </h2>
            <p className="mt-5 leading-8 text-white/72">
              Un jeu QR code ne doit pas être générique. Le bon lot, le bon délai et le bon support
              varient selon votre flux : table, comptoir, vente à emporter, événement ou service du midi.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {useCases.map((item) => (
              <article key={item.label} className="rounded-[22px] border border-white/10 bg-white/8 p-5">
                <p className="text-sm font-black uppercase tracking-[0.14em] text-[#ffddb4]">
                  {item.label}
                </p>
                <h3 className="mt-3 text-xl font-black tracking-[-0.04em]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/70">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="avis-google" className="mx-auto max-w-[1200px] px-5 py-18 md:py-24">
        <div className="grid gap-10 md:grid-cols-[1fr_0.9fr] md:items-center">
          <div>
            <span className="rounded-[4px] bg-[#6c00f6]/10 px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#6c00f6]">
              Avis Google restaurant
            </span>
            <h2 className="mt-5 text-4xl font-black leading-[1.08] tracking-[-0.055em] md:text-5xl">
              Demander un avis au bon moment, sans mettre votre équipe en difficulté.
            </h2>
            <p className="mt-5 leading-8 text-[#475569]">
              La demande d&apos;avis fonctionne mieux quand elle est contextualisée, rapide et naturelle.
              Okado permet de l&apos;intégrer dans un parcours client ludique, tout en évitant de promettre
              une récompense contre un avis positif.
            </p>
            <ul className="mt-7 space-y-4">
              {reviewStrategy.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-[#334155]">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#16a34a]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[28px] border border-[#f0dfcf] bg-white p-6 shadow-[0_22px_70px_rgba(49,25,11,0.1)]">
            <div className="rounded-[22px] bg-[#fffaf4] p-5">
              <Star className="h-10 w-10 fill-[#d6a51f] text-[#d6a51f]" />
              <p className="mt-5 text-2xl font-black tracking-[-0.05em]">
                Exemple de séquence
              </p>
              <div className="mt-5 grid gap-3">
                {[
                  ["Participation 1", "Laisser un avis Google."],
                  ["Participation 2", "Suivre Instagram."],
                  ["Participation 3", "Collecte e-mail ou lien personnalisé."],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-[16px] border border-[#f0dfcf] bg-white p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6c00f6]">
                      {title}
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-[#475569]">{text}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 rounded-[14px] bg-white p-4 text-sm font-semibold text-[#31190b]">
                Objectif : créer une croissance progressive des avis sans sollicitation lourde au moment du service.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-18 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <SectionTitle
            eyebrow="Retour client"
            title="Le gain doit créer une prochaine visite, pas seulement un cadeau immédiat."
            text="Le bon paramétrage transforme la gratification en revisite : délai de disponibilité, durée courte, retrait sur place et QR code unique."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-4">
            {returnStrategy.map((item) => (
              <article key={item.title} className="rounded-[24px] border border-[#e5e7eb] bg-[#f8fafc] p-6">
                <CalendarClock className="h-7 w-7 text-[#6c00f6]" />
                <h3 className="mt-5 text-lg font-black tracking-[-0.04em]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#64748b]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 py-18 md:py-24">
        <SectionTitle
          eyebrow="Affiches et QR code"
          title="Pas besoin d'équipe créa pour lancer votre animation."
          text="Okado génère directement les supports essentiels depuis votre campagne : affiche A4, QR code, visuel roue ou ticket, logo et texte d'accroche."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {posterBenefits.map((item) => (
            <article key={item.title} className="rounded-[24px] border border-[#f0dfcf] bg-white p-6">
              <item.icon className="h-8 w-8 text-[#6c00f6]" />
              <h3 className="mt-5 text-xl font-black tracking-[-0.04em]">{item.title}</h3>
              <p className="mt-3 leading-7 text-[#64748b]">{item.text}</p>
            </article>
          ))}
        </div>
        <div className="mt-10 rounded-[28px] border border-[#f0dfcf] bg-[#fffaf4] p-6 text-center shadow-[0_22px_60px_rgba(49,25,11,0.08)]">
          <p className="mx-auto max-w-2xl text-lg font-black leading-7 tracking-[-0.04em] text-[#31190b]">
            Créez la campagne, choisissez le modèle d&apos;affiche, imprimez et placez le QR code en salle.
            Pas de brief créa, pas d&apos;outil externe, pas d&apos;attente.
          </p>
          <div className="mt-5">
            <PrimaryButton href={`${APP_URL}/inscription`}>Créer mon affiche QR</PrimaryButton>
          </div>
        </div>
      </section>

      <section className="bg-[#f8fafc] px-5 py-18 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <SectionTitle
            eyebrow="Données et conformité"
            title="Rassurer vos clients, vos équipes et votre direction."
            text="Une animation restaurant peut collecter des données utiles. Elle doit donc être claire pour le client, exploitable pour vous, et structurée pour limiter les risques."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {trustItems.map((item) => (
              <article key={item.title} className="rounded-[24px] border border-[#e5e7eb] bg-white p-6">
                <item.icon className="h-8 w-8 text-[#16a34a]" />
                <h3 className="mt-5 text-xl font-black tracking-[-0.04em]">{item.title}</h3>
                <p className="mt-3 leading-7 text-[#64748b]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="lots" className="mx-auto max-w-[1200px] px-5 py-18 md:py-24">
        <SectionTitle
          eyebrow="Dotations"
          title="Quels lots proposer dans un jeu concours restaurant ?"
          text="Le meilleur lot n'est pas forcément le plus cher. Il doit être désirable, simple à délivrer, cohérent avec votre marge et capable de déclencher une prochaine visite."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-4">
          {prizes.map((item) => (
            <article key={item.group} className="rounded-[24px] border border-[#f0dfcf] bg-white p-6">
              <Gift className="h-8 w-8 text-[#d6a51f]" />
              <h3 className="mt-5 text-xl font-black tracking-[-0.04em]">{item.group}</h3>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-[#475569]">
                {item.examples.map((example) => (
                  <li key={example} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6c00f6]" />
                    {example}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 py-18 md:py-24">
        <div className="grid gap-6 rounded-[32px] border border-[#f0dfcf] bg-white p-6 shadow-[0_24px_80px_rgba(49,25,11,0.08)] md:grid-cols-[0.8fr_1.2fr] md:p-8">
          <div>
            <span className="rounded-[4px] bg-[#6c00f6]/10 px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#6c00f6]">
              Simulation pilote
            </span>
            <h2 className="mt-5 text-3xl font-black leading-[1.08] tracking-[-0.055em] md:text-[44px]">
              Une animation test doit prouver qu&apos;elle crée des retours.
            </h2>
            <p className="mt-4 leading-8 text-[#475569]">
              Sur un premier mois, mesurez combien de clients scannent, jouent, laissent leurs
              coordonnées et reviennent avec leur coupon.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {pilotSimulation.map((item) => (
              <div key={item.label} className="rounded-[22px] bg-[#fffaf4] p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-4xl font-black tracking-[-0.07em] text-[#6c00f6]">{item.value}</p>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-white text-[#6c00f6] shadow-[0_12px_24px_rgba(49,25,11,0.08)]">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-2 text-sm font-black tracking-[-0.03em] text-[#0f172b]">
                  {item.label}
                </p>
                <p className="mt-2 text-xs leading-5 text-[#64748b]">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="roi" className="bg-[#f8fafc] px-5 py-18 md:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-8 md:grid-cols-[0.95fr_1.05fr] md:items-center">
          <div>
            <span className="rounded-[4px] bg-[#6c00f6]/10 px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#6c00f6]">
              Retour sur investissement
            </span>
            <h2 className="mt-5 text-4xl font-black leading-[1.08] tracking-[-0.055em] md:text-5xl">
              Calculez le ROI avec des données terrain, pas avec des impressions.
            </h2>
            <p className="mt-5 leading-8 text-[#475569]">
              Okado suit les scans, participations, contacts clients, lots gagnés et retraits. Vous pouvez
              relier l&apos;effort marketing à des retours concrets : avis déclenchés, coupons envoyés et
              clients revenus.
            </p>
            <p className="mt-4 rounded-[18px] border border-[#e5e7eb] bg-white p-4 text-sm font-semibold leading-6 text-[#334155]">
              Sans jeu, le retour client dépend souvent du hasard ou de l&apos;habitude. Avec une mécanique
              datée, un coupon e-mail et un QR code de retrait, vous créez une raison claire de revenir
              et vous mesurez ce qui se passe réellement.
            </p>
          </div>
          <div className="rounded-[28px] border border-[#e5e7eb] bg-white p-6 shadow-[0_22px_70px_rgba(15,23,43,0.08)]">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#6c00f6]">
              Mois pilote
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["300", "scans mensuels"],
                ["70%", "participation"],
                ["105", "contacts clients"],
                ["24", "coupons présentés"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-[18px] bg-[#fffaf4] p-5">
                  <p className="text-4xl font-black tracking-[-0.06em] text-[#6c00f6]">{value}</p>
                  <p className="mt-2 text-sm font-semibold text-[#475569]">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-[18px] bg-[#31190b] p-5 text-white">
              <p className="mt-3 text-lg font-black leading-7">
                24 clients qui reviennent avec un panier moyen de 22 € représentent 528 € de chiffre
                d&apos;affaires additionnel potentiel, hors valeur des avis et des contacts collectés.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 py-18 md:py-24">
        <SectionTitle
          eyebrow="Mise en place"
          title="Une méthode de lancement restaurant en moins de 10 minutes."
          text="L'objectif n'est pas d'ajouter une charge à l'équipe. L'animation doit être compréhensible sans explication et pilotable depuis un tableau de bord simple."
        />
        <div className="mt-12 grid gap-4">
          {implementationPlan.map((item, index) => (
            <article
              key={`${item.day}-${item.title}`}
              className="grid gap-4 rounded-[24px] border border-[#f0dfcf] bg-white p-5 md:grid-cols-[120px_1fr_auto] md:items-center"
            >
              <span className="w-fit rounded-full bg-[#6c00f6]/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#6c00f6]">
                {item.day}
              </span>
              <div>
                <h3 className="text-xl font-black tracking-[-0.04em]">
                  {index + 1}. {item.title}
                </h3>
                <p className="mt-2 leading-7 text-[#64748b]">{item.text}</p>
              </div>
              <Clock3 className="hidden h-8 w-8 text-[#d6a51f] md:block" />
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white px-5 py-18 md:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-10 md:grid-cols-[0.85fr_1.15fr]">
          <div>
            <span className="rounded-[4px] bg-[#6c00f6]/10 px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#6c00f6]">
              Supports QR code
            </span>
            <h2 className="mt-5 text-4xl font-black leading-[1.08] tracking-[-0.055em] md:text-5xl">
              Où placer le QR code dans un restaurant ?
            </h2>
            <p className="mt-5 leading-8 text-[#475569]">
              Le meilleur emplacement dépend de votre flux. Testez plusieurs supports, puis gardez ceux
              qui génèrent le plus de scans et de participations.
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="lg:row-span-2">
              <RestaurantQrPhotoVisual />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {placementIdeas.slice(0, 4).map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-[18px] border border-[#e5e7eb] bg-[#f8fafc] p-4 text-sm font-semibold text-[#334155]"
                >
                  <MapPin className="h-5 w-5 text-[#6c00f6]" />
                  {item}
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {placementIdeas.slice(4).map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-[18px] border border-[#f0dfcf] bg-[#fffaf4] p-4 text-sm font-semibold text-[#334155]"
                >
                  <MapPin className="h-5 w-5 text-[#d6a51f]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 py-18 md:py-24">
        <SectionTitle
          eyebrow="Alternatives"
          title="Pourquoi utiliser un jeu QR code plutôt qu'une simple carte de fidélité ?"
          text="Le point clé n'est pas seulement la récompense : c'est la donnée, la mesure et le moment de participation."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {comparisonRows.map((row) => (
            <article
              key={row[0]}
              className={`rounded-[24px] border p-5 shadow-[0_18px_50px_rgba(49,25,11,0.07)] ${
                row[0] === "Okado"
                  ? "border-[#6c00f6]/30 bg-[#6c00f6] text-white"
                  : "border-[#f0dfcf] bg-white text-[#475569]"
              }`}
            >
              <p
                className={`text-lg font-black tracking-[-0.04em] ${
                  row[0] === "Okado" ? "text-white" : "text-[#0f172b]"
                }`}
              >
                {row[0]}
              </p>
              <div className="mt-5 space-y-4 text-sm leading-6">
                {[
                  ["Force", row[1]],
                  ["Limite", row[2]],
                  ["Terrain", row[3]],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p
                      className={`text-[11px] font-black uppercase tracking-[0.16em] ${
                        row[0] === "Okado" ? "text-white/60" : "text-[#94a3b8]"
                      }`}
                    >
                      {label}
                    </p>
                    <p className="mt-1 font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#31190b] px-5 py-18 text-white md:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <span className="rounded-[4px] bg-white/10 px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#ffddb4]">
              Sécurité opérationnelle
            </span>
            <h2 className="mt-5 text-4xl font-black leading-[1.08] tracking-[-0.055em] md:text-5xl">
              Un lot gagné ne peut être récupéré qu&apos;une seule fois.
            </h2>
            <p className="mt-5 leading-8 text-white/72">
              Chaque coupon de gain contient un QR code de retrait unique. Si le client le présente au
              personnel, le vendeur le scanne et le lot passe au statut récupéré.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              [QrCode, "QR code de retrait unique"],
              [ShieldCheck, "Validation vendeur"],
              [ReceiptText, "Historique des retraits"],
              [Ticket, "Stock limité ou illimité"],
            ].map(([Icon, label]) => {
              const TypedIcon = Icon as LucideIcon;
              return (
                <div key={label as string} className="rounded-[22px] border border-white/10 bg-white/8 p-5">
                  <TypedIcon className="h-8 w-8 text-[#ffddb4]" />
                  <p className="mt-4 text-lg font-black tracking-[-0.04em]">{label as string}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 py-18 md:py-24">
        <SectionTitle
          eyebrow="Objections fréquentes"
          title="Ce qui bloque souvent les restaurateurs avant de lancer."
          text="Une bonne animation ne doit pas compliquer le service. Elle doit être simple pour le client, claire pour l'équipe et rentable pour le restaurant."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {conversionObjections.map((item) => (
            <article
              key={item.question}
              className="rounded-[24px] border border-[#f0dfcf] bg-white p-6 shadow-[0_22px_60px_rgba(49,25,11,0.08)]"
            >
              <div className="flex items-start gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[#6c00f6]/10">
                  <Check className="h-5 w-5 text-[#6c00f6]" />
                </span>
                <div>
                  <h3 className="text-xl font-black tracking-[-0.04em] text-[#0f172b]">
                    {item.question}
                  </h3>
                  <p className="mt-3 leading-7 text-[#64748b]">{item.answer}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <PrimaryButton href={`${APP_URL}/inscription`}>
            Créer une animation sans engagement
          </PrimaryButton>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-[980px] px-5 py-18 md:py-24">
        <SectionTitle
          eyebrow="FAQ restaurants"
          title="Les questions fréquentes avant de lancer une animation QR code."
          text="Des réponses courtes pour décider rapidement si Okado correspond à votre restaurant."
        />
        <div className="mt-12 divide-y divide-[#f0dfcf] rounded-[28px] border border-[#f0dfcf] bg-white">
          {faqs.map((item) => (
            <details key={item.question} className="group p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-lg font-black tracking-[-0.04em] text-[#0f172b]">
                {item.question}
                <Sparkles className="h-5 w-5 shrink-0 text-[#6c00f6] transition group-open:rotate-45" />
              </summary>
              <p className="mt-4 leading-7 text-[#64748b]">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="px-5 pb-20">
        <div className="mx-auto max-w-[1200px] overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#6c00f6_0%,#31190b_100%)] p-8 text-white shadow-[0_30px_90px_rgba(108,0,246,0.24)] md:p-12">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-white/70">
                Prêt à tester en restaurant ?
              </p>
              <h2 className="mt-4 max-w-3xl text-4xl font-black leading-[1.05] tracking-[-0.06em] md:text-6xl">
                Lancez votre première animation QR code en 10 minutes.
              </h2>
              <p className="mt-5 max-w-2xl leading-8 text-white/72">
                Créez une campagne, imprimez votre affiche, placez-la en salle et suivez vos scans,
                contacts clients, avis et retraits depuis votre espace Okado.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <PrimaryButton href={`${APP_URL}/inscription`}>Créer mon compte</PrimaryButton>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-[10px] border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Retour à la page d&apos;accueil
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
