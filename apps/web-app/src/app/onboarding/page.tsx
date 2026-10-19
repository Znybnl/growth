import { AuthShell } from "@/components/auth/auth-shell";
import { OnboardingFlow } from "@/components/auth/onboarding-flow";
import { MerchantSessionGuard } from "@/components/merchant/merchant-session-guard";
import { requireAuthenticatedSession } from "@/lib/auth";

export default async function OnboardingPage() {
  const session = await requireAuthenticatedSession();

  return (
    <AuthShell
      eyebrow="Onboarding boutique"
      title="Cadrez votre dispositif avant la premiere campagne."
      description="Un onboarding en 3 étapes pour renseigner le profil, les liens marketing et le code de retrait."
      asideTitle="Ce que l'on prepare"
      asideBody="L'idee est d'arriver sur la creation de campagne avec des choix deja clairs et des actions deja preconfigurees."
      asideItems={[
        "Renseigner le profil de l’établissement",
        "Ajouter les liens marketing utiles",
        "Sécuriser les retraits avec un code PIN",
      ]}
      flatContent
    >
      <MerchantSessionGuard userId={session.user.id} />
      <OnboardingFlow merchant={session.merchant} />
    </AuthShell>
  );
}
