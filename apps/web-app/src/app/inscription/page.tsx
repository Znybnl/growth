import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { redirectAuthenticatedMerchant } from "@/lib/auth";

export default async function SignUpPage() {
  await redirectAuthenticatedMerchant();

  return (
    <AuthShell
      eyebrow="Inscription marchand"
      title="Lancez votre dispositif d’activation en quelques minutes."
      description="Créez votre compte boutique, configurez votre identité de marque et préparez votre premier jeu avant diffusion."
      asideTitle="Ce que vous débloquez"
      asideBody="Une base de pilotage conçue pour les commerces qui veulent activer et mesurer vite."
      asideItems={[
        "Parcours public mobile en plein écran",
        "Mécaniques au choix : roue ou ticket à gratter",
        "Dashboard marchand, campagnes, données et onboarding guidé",
      ]}
    >
      <SignUpForm />
    </AuthShell>
  );
}
