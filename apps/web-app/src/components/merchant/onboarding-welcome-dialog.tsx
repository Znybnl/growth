"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type OnboardingWelcomeDialogProps = { open: boolean };

export function OnboardingWelcomeDialog({ open }: OnboardingWelcomeDialogProps) {
  const router = useRouter();

  if (!open) return null;

  function close() {
    router.replace("/");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight-ink/40 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-welcome-title"
        className="w-full max-w-lg rounded-[var(--okado-radius-modal)] border border-border bg-white p-6 shadow-[var(--shadow-product-card)] sm:p-8"
      >
        <p className="okado-label">Votre espace est prêt</p>
        <h2 id="onboarding-welcome-title" className="okado-section-title mt-2">
          Bienvenue !
        </h2>
        <p className="mt-4 text-sm leading-7 text-ash">
          Vous pouvez maintenant fidéliser votre clientèle et récolter des avis en toute simplicité.
          Prêt à booster votre visibilité ?
        </p>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={close} className="okado-secondary-action px-5">
            Plus tard
          </button>
          <Link href="/campaigns/new/guided" className="okado-filled-action px-5 text-center">
            Créer mon premier jeu
          </Link>
        </div>
      </section>
    </div>
  );
}
