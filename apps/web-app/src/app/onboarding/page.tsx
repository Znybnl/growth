import { OnboardingScreen } from "@/components/auth/onboarding-screen";
import { requireAuthenticatedSession } from "@/lib/auth";
import { BetaReplayBoundary } from "@/components/merchant/beta-replay-boundary";

export default async function OnboardingPage() {
  const session = await requireAuthenticatedSession();

  return (
    <>
      <BetaReplayBoundary subject={`${session.user.merchantId}:${session.user.id}`} />
      <OnboardingScreen merchant={session.merchant} user={{
        id: session.user.id,
        merchantId: session.user.merchantId,
        email: session.user.email,
      }} />
    </>
  );
}
