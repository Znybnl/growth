import Image from "next/image";
import { Check, ScanLine } from "lucide-react";

const panelCopy = {
  signup: {
    title: "Créez des animations qui donnent envie de revenir.",
    body: "Personnalisez votre roue ou votre ticket à gratter, faites jouer vos clients via QR code et suivez les gains depuis votre espace marchand.",
    benefits: [
      "Créez un jeu à votre image",
      "Faites jouer vos clients en quelques secondes",
      "Suivez participations, gains et retraits",
    ],
  },
  signin: {
    title: "Retrouvez vos jeux et vos résultats.",
    body: "Gérez vos campagnes, suivez les participations et validez les cadeaux remis à vos clients.",
    benefits: [
      "Retrouvez vos campagnes actives.",
      "Suivez les participations et les gains.",
      "Gérez les retraits de cadeaux.",
    ],
  },
  onboarding: {
    title: "Une base prête pour votre première campagne.",
    body: "Renseignez l’essentiel maintenant ; tout reste modifiable depuis votre compte.",
    benefits: [
      "Définissez les informations de votre commerce",
      "Préparez vos liens marketing réutilisables",
      "Commencez quand vous êtes prêt",
    ],
  },
};

export function SignupProductPanel({ mode = "signup" }: { mode?: keyof typeof panelCopy }) {
  const copy = panelCopy[mode];
  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-[#431a4c] px-8 py-10 text-white lg:flex lg:items-center lg:justify-center xl:px-12" aria-label="Découvrez Okado">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_28%,rgba(164,96,174,.46),transparent_58%),linear-gradient(150deg,#64206f,#381342)]" />
      <div className="relative flex w-full max-w-[680px] flex-col items-center text-center">
        <div data-testid="auth-promo-art" className="relative w-full max-w-[620px]" aria-hidden="true">
          <Image src="/images/auth/inscription-jeu.webp" alt="" width={1200} height={900} sizes="(min-width: 1024px) 50vw, 1px" loading="lazy" className="h-auto w-full" />
          {/* The supplied image contains an illustrative, unverified QR: cover it rather than suggesting it is scannable. */}
          <div className="absolute left-[12.4%] top-[64%] flex h-[20%] w-[15.5%] rotate-[-2deg] flex-col items-center justify-center gap-1 rounded-lg bg-[#f4eded] text-[#54205e] shadow-sm">
            <ScanLine className="h-7 w-7 sm:h-9 sm:w-9" />
          </div>
        </div>
        <h2 data-testid="auth-promo-copy" className="mt-6 max-w-[540px] text-balance text-[clamp(1.7rem,2.5vw,2.3rem)] font-semibold leading-[1.12] tracking-tight">{copy.title}</h2>
        <p className="mt-4 max-w-[510px] text-sm leading-6 text-white/90">{copy.body}</p>
        <ul className="mt-7 flex w-full flex-wrap justify-center gap-x-5 gap-y-3 text-left text-[14px] font-semibold leading-5 text-white">
          {copy.benefits.map(benefit => <li key={benefit} className="flex max-w-[200px] flex-1 basis-[150px] items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{benefit}</li>)}
        </ul>
      </div>
    </aside>
  );
}
