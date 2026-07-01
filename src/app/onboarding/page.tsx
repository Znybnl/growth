import { AuthShell } from "@/components/auth/auth-shell";
import { OnboardingFlow } from "@/components/auth/onboarding-flow";
import { requireAuthenticatedSession } from "@/lib/auth";

export default async function OnboardingPage() {
  const session = await requireAuthenticatedSession();

  return (
    <AuthShell
      eyebrow="Onboarding boutique"
      title="Cadrez votre dispositif avant la premiere campagne."
      description="Un onboarding en 3 etapes pour poser la marque, les objectifs et les liens marketing reutilisables."
      asideTitle="Ce que l'on prepare"
      asideBody="L'idee est d'arriver sur la creation de campagne avec des choix deja clairs et des actions deja preconfigurees."
      asideItems={[
        "Definir vos objectifs prioritaires",
        "Renseigner votre secteur d'activite",
        "Connecter vos liens Google et reseaux sociaux",
      ]}
    >
      <OnboardingFlow merchant={session.merchant} />
    </AuthShell>
  );
}
