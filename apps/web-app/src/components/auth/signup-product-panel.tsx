import Image from "next/image";
import { Check, ScanLine } from "lucide-react";

const benefits = [
  "Créez un jeu à votre image",
  "Faites jouer vos clients en quelques secondes",
  "Suivez participations, gains et retraits",
];

export function SignupProductPanel() {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-[#431a4c] px-8 py-10 text-white lg:flex lg:items-center lg:justify-center xl:px-12" aria-label="Découvrez Okado">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_28%,rgba(164,96,174,.46),transparent_58%),linear-gradient(150deg,#64206f,#381342)]" />
      <div className="relative flex w-full max-w-[680px] flex-col items-center text-center">
        <div className="relative w-full max-w-[620px]" aria-hidden="true">
          <Image src="/images/auth/inscription-jeu.webp" alt="" width={1200} height={900} sizes="(min-width: 1024px) 50vw, 1px" loading="lazy" className="h-auto w-full" />
          {/* The supplied image contains an illustrative, unverified QR: cover it rather than suggesting it is scannable. */}
          <div className="absolute left-[12.4%] top-[64%] flex h-[20%] w-[15.5%] rotate-[-2deg] flex-col items-center justify-center gap-1 rounded-lg bg-[#f4eded] text-[#54205e] shadow-sm">
            <ScanLine className="h-7 w-7 sm:h-9 sm:w-9" />
            <span className="text-[8px] font-semibold leading-tight">QR code<br />illustratif</span>
          </div>
        </div>
        <p className="mt-1 text-xs text-white/80">Visuels et résultats fictifs, à titre illustratif.</p>
        <h2 className="mt-5 max-w-[540px] text-balance text-[clamp(1.7rem,2.5vw,2.3rem)] font-semibold leading-[1.12] tracking-tight">Créez des animations qui donnent envie de revenir.</h2>
        <p className="mt-4 max-w-[510px] text-sm leading-6 text-white/90">Personnalisez votre roue ou votre ticket à gratter, faites jouer vos clients via QR code et suivez les gains depuis votre espace marchand.</p>
        <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-3 text-left text-xs font-medium leading-5 text-white/95">
          {benefits.map(benefit => <li key={benefit} className="flex max-w-[190px] items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{benefit}</li>)}
        </ul>
      </div>
    </aside>
  );
}
