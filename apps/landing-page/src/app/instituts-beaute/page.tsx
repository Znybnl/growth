import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Crown,
  Gift,
  HeartHandshake,
  Mail,
  MapPin,
  MessageSquareText,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  type LucideIcon,
} from "lucide-react";

import { LandingDemo } from "@/components/marketing/landing-demo";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.okado.app";

export const metadata: Metadata = {
  title: "Jeu QR code institut de beauté : avis Google et fidélisation | Okado",
  description:
    "Okado aide les instituts de beauté à obtenir plus d'avis Google, relancer leurs clientes et remplir les prochains rendez-vous grâce à un jeu QR code personnalisable.",
  keywords: [
    "jeu concours institut de beauté",
    "fidélisation institut de beauté",
    "avis Google institut de beauté",
    "QR code salon de beauté",
    "animation institut beauté",
    "collecte email institut beauté",
    "faire revenir clientes institut",
  ],
  alternates: { canonical: "https://okado.app/instituts-beaute" },
  openGraph: {
    title: "Okado pour les instituts de beauté",
    description: "Transformez chaque passage en avis, contact client et prochain rendez-vous.",
    url: "https://okado.app/instituts-beaute",
    siteName: "Okado",
    locale: "fr_FR",
    type: "website",
  },
};

type IconCard = { icon: LucideIcon; title: string; text: string };

const painPoints: IconCard[] = [
  {
    icon: CalendarDays,
    title: "Le prochain rendez-vous n'est pas acquis",
    text: "Après une prestation réussie, la cliente repart satisfaite mais sans raison concrète de revenir à une date donnée.",
  },
  {
    icon: MessageSquareText,
    title: "Les avis arrivent trop rarement",
    text: "Le bon moment pour demander un retour est juste après l'expérience. Sans support visible, cette opportunité est souvent perdue.",
  },
  {
    icon: Mail,
    title: "La relation s'arrête à la caisse",
    text: "Sans consentement et contact client, l'institut dépend exclusivement de la prise de rendez-vous spontanée.",
  },
];

const useCases = [
  { icon: Star, title: "Booster les avis Google", text: "Proposez une action avis sans jamais conditionner le gain à un avis positif." },
  { icon: RefreshCw, title: "Créer le prochain passage", text: "Faites gagner une remise, un soin complémentaire ou un crédit valable lors de la prochaine visite." },
  { icon: HeartHandshake, title: "Faire connaître vos soins", text: "Dirigez vers Instagram, une nouveauté, une carte cadeau ou une prestation signature." },
  { icon: Mail, title: "Constituer une base consentie", text: "Collectez prénom et e-mail uniquement au moment du gain, avec un parcours clair." },
];

const prizeIdeas = [
  { value: "35 %", title: "Réduction de 10 %", text: "Le lot de consolation qui donne une raison immédiate de reprendre rendez-vous.", icon: Ticket },
  { value: "25 %", title: "Mini-produit beauté", text: "Une attention accessible, idéale pour faire découvrir une gamme ou remercier une cliente.", icon: Gift },
  { value: "15 %", title: "Supplément soin", text: "Masque, massage, finition ou option premium à offrir sur la prochaine prestation.", icon: Sparkles },
  { value: "2 %", title: "Prestation signature", text: "Le gros lot qui crée l'envie sans mettre en risque votre marge.", icon: Crown },
];

const launchSteps: IconCard[] = [
  { icon: Sparkles, title: "1. Créez votre animation", text: "Choisissez la roue ou le ticket, vos couleurs, vos lots et l'action à proposer." },
  { icon: QrCode, title: "2. Générez votre support", text: "Okado crée une affiche A4 avec votre QR code : aucun graphiste ni outil de création requis." },
  { icon: MapPin, title: "3. Placez-la au bon endroit", text: "Accueil, espace attente, cabine, caisse ou près de la prise de rendez-vous." },
  { icon: BadgeCheck, title: "4. Suivez et réactivez", text: "Scans, participations, contacts, coupons et retours sont visibles depuis votre tableau de bord." },
];

const faqs = [
  { question: "Est-ce que le jeu impose un avis Google positif ?", answer: "Non. Okado n'impose pas d'avis positif et ne conditionne jamais le gain à une note. L'avis peut être proposé comme action, de manière transparente." },
  { question: "Quels cadeaux fonctionnent en institut ?", answer: "Les remises sur une prochaine prestation, mini-produits, suppléments soins, crédits et prestations signature sont simples à comprendre et compatibles avec différents niveaux de marge." },
  { question: "Mes données clientes restent-elles ma propriété ?", answer: "Oui. Votre institut reste propriétaire des contacts collectés. Okado vous permet de les consulter et de les exporter depuis votre espace." },
  { question: "Mon équipe doit-elle gérer le jeu ?", answer: "Très peu. Le client scanne et suit le parcours sur son téléphone. Au retrait, le QR code unique du gain est présenté et validé une seule fois." },
];

function BrandMark() {
  return (
    <Link href="/" className="inline-flex items-center gap-2 text-[#24142a]">
      <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-[#24142a] text-sm font-black text-white">O</span>
      <span className="font-serif text-2xl font-semibold tracking-[-0.06em]">Okado</span>
    </Link>
  );
}

function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#24142a] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_16px_30px_rgba(60,26,64,0.16)] transition hover:-translate-y-0.5 hover:bg-[#9b3e62]">{children}<ArrowRight className="h-4 w-4" /></Link>;
}

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <div className="mx-auto max-w-3xl text-center"><span className="rounded-full bg-[#f8e8ee] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#9b3e62]">{eyebrow}</span><h2 className="mt-5 text-3xl font-black leading-[1.08] tracking-[-0.055em] text-[#24142a] md:text-[46px]">{title}</h2><p className="mt-4 text-base leading-7 text-[#645765] md:text-lg">{text}</p></div>;
}

function BeautyCounterVisual() {
  return (
    <div className="relative overflow-hidden rounded-[30px] border border-[#eadde2] bg-[radial-gradient(circle_at_15%_15%,#fff_0%,#fff7f4_35%,#f6e8ef_100%)] p-6 shadow-[0_24px_70px_rgba(69,38,72,0.12)] md:p-8">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full border-[28px] border-[#e8aec0]/40" />
      <div className="absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-[#c99a55]/10 blur-2xl" />
      <div className="relative grid gap-7 md:grid-cols-[0.9fr_1.1fr] md:items-center">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9b3e62]">Support prêt à poser</p><h3 className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.05em] text-[#24142a]">Une animation élégante, visible entre deux rendez-vous.</h3><p className="mt-4 leading-7 text-[#645765]">Votre affiche est créée directement dans Okado, avec votre logo, vos couleurs et votre QR code. Elle s&apos;imprime en un clic.</p><div className="mt-6 flex flex-wrap gap-2 text-sm font-semibold text-[#513049]"><span className="rounded-full bg-white px-3 py-2 shadow-sm">Accueil</span><span className="rounded-full bg-white px-3 py-2 shadow-sm">Espace attente</span><span className="rounded-full bg-white px-3 py-2 shadow-sm">Caisse</span></div></div>
        <div className="relative mx-auto h-[330px] w-full max-w-[400px] rounded-[28px] bg-[#fffdfa] p-5 shadow-[0_20px_50px_rgba(69,38,72,0.16)]"><div className="text-center"><p className="font-serif text-xl font-semibold text-[#24142a]">Votre institut</p><p className="mt-3 text-3xl font-black leading-none tracking-[-0.06em] text-[#9b3e62]">PRENEZ SOIN<br/>DE VOUS</p></div><div className="absolute bottom-5 left-5 h-36 w-36 rounded-full border-[10px] border-[#f2e7e3] bg-[conic-gradient(#9b3e62_0_30deg,#f9ede9_30deg_60deg,#e8aec0_60deg_90deg,#fffaf6_90deg_120deg,#9b3e62_120deg_150deg,#f9ede9_150deg_180deg,#e8aec0_180deg_210deg,#fffaf6_210deg_240deg,#9b3e62_240deg_270deg,#f9ede9_270deg_300deg,#e8aec0_300deg_330deg,#fffaf6_330deg_360deg)] shadow-[0_14px_28px_rgba(69,38,72,0.16)]"><span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#9b3e62] text-[10px] font-black text-white">JOUER</span></div><div className="absolute bottom-5 right-5 grid h-40 w-40 grid-cols-7 gap-1 rounded-[16px] border-[7px] border-[#9b3e62] bg-white p-3">{Array.from({ length: 49 }).map((_, index) => <span key={index} className={(index % 3 === 0 || index % 7 === 1 || index % 11 === 0) ? "bg-[#24142a]" : "bg-transparent"} />)}</div></div>
      </div>
    </div>
  );
}

function JsonLd() {
  const value = { "@context": "https://schema.org", "@graph": [{ "@type": "SoftwareApplication", name: "Okado Instituts de beauté", applicationCategory: "BusinessApplication", operatingSystem: "Web", url: "https://okado.app/instituts-beaute", description: "Jeu QR code, avis Google et fidélisation pour instituts de beauté." }, { "@type": "FAQPage", mainEntity: faqs.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) }] };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value) }} />;
}

export default function BeautyInstitutesPage() {
  return (
    <main className="min-h-screen bg-[#fffaf8] text-[#24142a]"><JsonLd />
      <div className="border-b border-[#f0dde4] bg-[#24142a] px-4 py-2 text-center text-sm font-semibold text-white">30 jours d&apos;essai gratuit pour lancer votre première animation institut.</div>
      <header className="sticky top-0 z-30 border-b border-[#f0dde4] bg-[#fffaf8]/92 backdrop-blur-xl"><div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-5"><BrandMark /><nav className="hidden items-center gap-7 text-sm font-semibold text-[#513049] md:flex"><a href="#avis" className="hover:text-[#9b3e62]">Avis Google</a><a href="#retours" className="hover:text-[#9b3e62]">Fidélisation</a><a href="#lots" className="hover:text-[#9b3e62]">Lots</a><a href="#faq" className="hover:text-[#9b3e62]">FAQ</a></nav><PrimaryButton href={`${APP_URL}/inscription`}>Essayer gratuitement</PrimaryButton></div></header>

      <section className="relative overflow-hidden border-b border-[#f0dde4]"><div className="absolute -left-24 top-12 h-80 w-80 rounded-full bg-[#e9b4c6]/40 blur-3xl" /><div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#f4d59f]/25 blur-3xl" /><div className="relative mx-auto max-w-[1200px] px-5 py-16 text-center md:py-24"><span className="inline-flex items-center gap-2 rounded-full border border-[#edd5df] bg-white px-3 py-1.5 text-sm font-semibold text-[#9b3e62] shadow-[0_12px_30px_rgba(69,38,72,0.08)]"><Sparkles className="h-4 w-4" />Marketing terrain pour instituts de beauté</span><h1 className="mx-auto mt-7 max-w-4xl text-[42px] font-black leading-[1.03] tracking-[-0.065em] text-[#24142a] md:text-[64px]">Transformez chaque rendez-vous en avis Google, contact client et prochaine visite.</h1><p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#645765]">Okado crée une animation QR code élégante pour votre institut. La cliente scanne, découvre votre univers, joue, reçoit son avantage par e-mail et revient le présenter lors de sa prochaine prestation.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><PrimaryButton href={`${APP_URL}/inscription`}>Créer mon animation institut</PrimaryButton><Link href="#demo" className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#e8d4dc] bg-white px-5 py-3 text-[15px] font-semibold text-[#513049] shadow-[0_12px_30px_rgba(69,38,72,0.08)] transition hover:-translate-y-0.5">Voir le parcours cliente <ArrowRight className="h-4 w-4" /></Link></div><div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">{["30 jours d'essai", "Affiche QR incluse", "Retrait sécurisé"].map((item) => <div key={item} className="flex items-center justify-center gap-2 text-sm font-semibold text-[#513049]"><Check className="h-4 w-4 text-[#169c69]" />{item}</div>)}</div><div id="demo" className="mt-12"><LandingDemo variant="beauty" /></div></div></section>

      <section className="mx-auto max-w-[1200px] px-5 py-20 md:py-28"><SectionTitle eyebrow="Le défi institut" title="Une belle expérience mérite un prochain rendez-vous." text="Dans la beauté, l'acquisition locale se joue sur la confiance, la preuve sociale et la régularité. Okado rend ce parcours visible, ludique et mesurable sans alourdir l'accueil." /><div className="mt-12 grid gap-5 md:grid-cols-3">{painPoints.map((item) => <article key={item.title} className="rounded-[24px] border border-[#ecdde4] bg-white p-6 shadow-[0_22px_60px_rgba(69,38,72,0.08)]"><item.icon className="h-8 w-8 text-[#9b3e62]" /><h3 className="mt-5 text-xl font-black tracking-[-0.04em]">{item.title}</h3><p className="mt-3 leading-7 text-[#756774]">{item.text}</p></article>)}</div></section>

      <section id="avis" className="bg-white px-5 py-20 md:py-28"><div className="mx-auto max-w-[1200px]"><SectionTitle eyebrow="Réputation locale" title="Demandez un avis au moment où la satisfaction est la plus fraîche." text="Une animation ne remplace pas la qualité de service. Elle donne simplement un support clair à la cliente qui souhaite partager son expérience, tout en respectant la liberté de son avis." /><div className="mt-12 grid gap-4 md:grid-cols-3"><a href="https://www.brightlocal.com/research/local-consumer-review-survey-2025/" target="_blank" rel="noreferrer" className="rounded-[24px] border border-[#eadde2] bg-[#fff9fb] p-6 transition hover:-translate-y-1"><p className="text-4xl font-black tracking-[-0.06em] text-[#9b3e62]">Avis récents</p><p className="mt-4 text-sm leading-6 text-[#513049]">Les consommateurs utilisent les avis et leurs détails pour comparer les entreprises locales.</p><p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#9a8794]">BrightLocal, étude consommateurs</p></a><a href="https://www.zenoti.com/thecheckin/beauty-wellness-industry-statistics-2025" target="_blank" rel="noreferrer" className="rounded-[24px] border border-[#eadde2] bg-[#fff9fb] p-6 transition hover:-translate-y-1"><p className="text-4xl font-black tracking-[-0.06em] text-[#9b3e62]">Rétention</p><p className="mt-4 text-sm leading-6 text-[#513049]">Dans la beauté et le bien-être, la récurrence des clientes est un levier de croissance prioritaire.</p><p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#9a8794]">Zenoti, Beauty & Wellness 2025</p></a><div className="rounded-[24px] border border-[#eadde2] bg-[#24142a] p-6 text-white"><ShieldCheck className="h-8 w-8 text-[#f0c0cf]" /><p className="mt-5 text-xl font-black tracking-[-0.04em]">Une mécanique responsable</p><p className="mt-3 text-sm leading-6 text-white/72">Le gain n&apos;est jamais conditionné à un avis positif. Les contacts collectés restent la propriété de votre institut.</p></div></div></div></section>

      <section id="retours" className="mx-auto max-w-[1200px] px-5 py-20 md:py-28"><div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"><div><span className="rounded-full bg-[#f8e8ee] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#9b3e62]">Un retour mesurable</span><h2 className="mt-5 text-4xl font-black leading-[1.06] tracking-[-0.06em] md:text-[52px]">Le cadeau est une invitation à revenir, pas une remise permanente.</h2><p className="mt-5 max-w-xl text-lg leading-8 text-[#645765]">Vous choisissez quand le lot devient disponible et pendant combien de jours. Une remise, un mini-produit ou un soin complémentaire peut être réservé au prochain passage.</p><div className="mt-8 grid gap-4 sm:grid-cols-2">{useCases.map((item) => <div key={item.title} className="rounded-[20px] border border-[#eadde2] bg-white p-5"><item.icon className="h-6 w-6 text-[#9b3e62]" /><p className="mt-4 font-black tracking-[-0.03em]">{item.title}</p><p className="mt-2 text-sm leading-6 text-[#756774]">{item.text}</p></div>)}</div></div><BeautyCounterVisual /></div></section>

      <section id="lots" className="bg-[#f8eef1] px-5 py-20 md:py-28"><div className="mx-auto max-w-[1200px]"><SectionTitle eyebrow="Dotations maîtrisées" title="Des cadeaux pensés pour votre marge et votre activité." text="Commencez avec des lots simples et une probabilité claire. Okado vous aide à distribuer les gains, suivre le stock et sécuriser leur retrait." /><div className="mt-12 grid gap-4 md:grid-cols-4">{prizeIdeas.map((item) => <article key={item.title} className="rounded-[24px] border border-[#ead9e0] bg-white p-6 shadow-[0_16px_35px_rgba(69,38,72,0.06)]"><div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-[15px] bg-[#f8e8ee] text-[#9b3e62]"><item.icon className="h-5 w-5" /></span><span className="rounded-full bg-[#24142a] px-2.5 py-1 text-xs font-bold text-white">{item.value}</span></div><h3 className="mt-5 text-lg font-black tracking-[-0.04em]">{item.title}</h3><p className="mt-3 text-sm leading-6 text-[#756774]">{item.text}</p></article>)}</div><p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-6 text-[#756774]">Les probabilités sont des exemples de démarrage. Elles sont personnalisables et les gains restent limités par votre stock.</p></div></section>

      <section className="mx-auto max-w-[1200px] px-5 py-20 md:py-28"><SectionTitle eyebrow="Mise en place" title="Lancez une animation institut en moins de 10 minutes." text="Aucune application à installer pour vos clientes, aucun développement et aucune création graphique à externaliser." /><div className="mt-12 grid gap-4 md:grid-cols-4">{launchSteps.map((item, index) => <article key={item.title} className="relative rounded-[24px] border border-[#eadde2] bg-white p-6"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#24142a] text-sm font-black text-white">{index + 1}</span><item.icon className="absolute right-6 top-7 h-6 w-6 text-[#d28ca5]" /><h3 className="mt-6 text-lg font-black tracking-[-0.04em]">{item.title.slice(3)}</h3><p className="mt-3 text-sm leading-6 text-[#756774]">{item.text}</p></article>)}</div></section>

      <section className="bg-[#24142a] px-5 py-20 text-white md:py-24"><div className="mx-auto grid max-w-[1000px] gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f0c0cf]">Pilote institut</p><h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-[-0.06em] md:text-[52px]">Mesurez ce qui vous fait revenir, pas seulement ce qui vous fait jouer.</h2><p className="mt-5 max-w-xl leading-8 text-white/72">Suivez les scans, les participations, les e-mails collectés, les gains et les retraits. Vous gardez une vision claire de ce qui déclenche réellement un prochain passage.</p><div className="mt-7"><PrimaryButton href={`${APP_URL}/inscription`}>Démarrer mon essai gratuit</PrimaryButton></div></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-[20px] bg-white/10 p-5"><CircleDollarSign className="h-6 w-6 text-[#f0c0cf]" /><p className="mt-4 text-lg font-black">Marge maîtrisée</p><p className="mt-2 text-sm leading-6 text-white/70">Chaque lot est configuré avec un coût et un stock.</p></div><div className="rounded-[20px] bg-white/10 p-5"><QrCode className="h-6 w-6 text-[#f0c0cf]" /><p className="mt-4 text-lg font-black">Retrait unique</p><p className="mt-2 text-sm leading-6 text-white/70">Le QR code de gain ne peut être validé qu&apos;une seule fois.</p></div></div></div></section>

      <section id="faq" className="mx-auto max-w-[900px] px-5 py-20 md:py-28"><SectionTitle eyebrow="Questions fréquentes" title="Tout ce qu'il faut savoir avant de lancer votre jeu." text="Un parcours simple pour l'institut, une expérience ludique pour la cliente." /><div className="mt-12 divide-y divide-[#eadde2] rounded-[24px] border border-[#eadde2] bg-white px-6">{faqs.map((item) => <details key={item.question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-black tracking-[-0.025em]"><span>{item.question}</span><ChevronRight className="h-5 w-5 shrink-0 text-[#9b3e62] transition group-open:rotate-90" /></summary><p className="mt-3 max-w-3xl leading-7 text-[#756774]">{item.answer}</p></details>)}</div></section>
      <footer className="border-t border-[#eadde2] px-5 py-8"><div className="mx-auto flex max-w-[1200px] flex-col gap-4 text-sm text-[#756774] sm:flex-row sm:items-center sm:justify-between"><BrandMark /><div className="flex flex-wrap gap-5"><Link href="/restaurants" className="hover:text-[#9b3e62]">Restaurants</Link><Link href="/cgv" className="hover:text-[#9b3e62]">CGV</Link><Link href={`${APP_URL}/connexion`} className="hover:text-[#9b3e62]">Connexion</Link></div></div></footer>
    </main>
  );
}
