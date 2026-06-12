import { AuthShell } from "@/components/auth/auth-shell";
import { OnboardingFlow } from "@/components/auth/onboarding-flow";
import { requireAuthenticatedSession } from "@/lib/auth";

export default async function OnboardingPage() {
  const session = await requireAuthenticatedSession();

  return (
    <AuthShell
      eyebrow="Onboarding boutique"
      title="Cadrez votre dispositif avant la première campagne."
      description="Un onboarding court, pensé pour les marchands, afin de préparer la marque, les objectifs et la diffusion terrain."
      asideTitle="Pourquoi cet onboarding"
      asideBody="Il structure votre lancement sans vous noyer dans des réglages techniques."
      asideItems={[
        "Définir vos canaux prioritaires",
        "Préparer vos supports de diffusion magasin",
        "Arriver sur la création de campagne avec une base propre",
      ]}
    >
      <OnboardingFlow merchant={session.merchant} />
    </AuthShell>
  );
}
