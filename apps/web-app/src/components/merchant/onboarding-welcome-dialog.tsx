"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { DialogShell } from "@/components/ui/dialog";

type OnboardingWelcomeDialogProps = { open: boolean };

export function OnboardingWelcomeDialog({ open }: OnboardingWelcomeDialogProps) {
  const router = useRouter();

  if (!open) return null;

  function close() {
    router.replace("/");
  }

  return (
    <DialogShell open={open} onClose={close} labelledBy="onboarding-welcome-title" className="max-w-lg p-6 sm:p-8">
        <p className="okado-label">Votre espace est prêt</p>
        <h2 id="onboarding-welcome-title" className="okado-section-title mt-2">
          Bienvenue !
        </h2>
        <p className="mt-4 text-sm leading-7 text-ash">
          Vous pouvez maintenant fidéliser votre clientèle et récolter des avis en toute simplicité.
          Prêt à booster votre visibilité ?
        </p>
        <div className="okado-action-row mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={close} className="okado-secondary-action px-5 sm:flex-1">
            Plus tard
          </button>
          <Link href="/campaigns/new/guided" className="okado-filled-action px-5 text-center sm:flex-1">
            Créer mon premier jeu
          </Link>
        </div>
    </DialogShell>
  );
}
