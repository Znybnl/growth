import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { redirectAuthenticatedMerchant } from "@/lib/auth";

export default async function SignInPage() {
  await redirectAuthenticatedMerchant();

  return (
    <AuthShell
      eyebrow="Connexion marchand"
      title="Reprenez la main sur vos activations locales."
      description="Connectez-vous pour suivre vos campagnes, vos participations et vos dotations depuis un seul espace marchand."
      asideTitle="Accès rapide"
      asideBody="Un espace pensé pour les responsables boutique et les équipes terrain."
      asideItems={[
        "Visualisation instantanée des campagnes actives",
        "Pilotage des mécaniques roue et ticket à gratter",
        "Suivi des leads, lots et performances journalières",
      ]}
    >
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
