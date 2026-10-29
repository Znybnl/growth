import { OnboardingScreen } from "@/components/auth/onboarding-screen";
import { requireAuthenticatedSession } from "@/lib/auth";

export default async function OnboardingPage() {
  const session = await requireAuthenticatedSession();

  return <OnboardingScreen merchant={session.merchant} user={{
    id: session.user.id,
    merchantId: session.user.merchantId,
    email: session.user.email,
  }} />;
}
