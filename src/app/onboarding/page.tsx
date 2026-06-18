import { AuthShell } from "@/components/auth/auth-shell";
import { OnboardingFlow } from "@/components/auth/onboarding-flow";
import { requireAuthenticatedSession } from "@/lib/auth";

export default async function OnboardingPage() {
  const session = await requireAuthenticatedSession();

  return (
    <AuthShell
      eyebrow="Onboarding boutique"
      title="Cadrez votre dispositif avant la premiere campagne."
      description="Un onboarding en 4 etapes pour poser la marque, les objectifs, la logique de dotation et les supports terrain."
      asideTitle="Ce que l'on prepare"
      asideBody="L'idee est d'arriver sur la creation de campagne avec des choix deja clairs et directement reutilisables."
      asideItems={[
        "Definir vos canaux prioritaires",
        "Fixer une base de dotation et de cout moyen",
        "Preparer les points de diffusion en magasin",
      ]}
    >
      <OnboardingFlow merchant={session.merchant} />
    </AuthShell>
  );
}
