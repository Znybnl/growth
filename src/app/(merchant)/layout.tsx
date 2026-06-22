import { MerchantShell } from "@/components/merchant/merchant-shell";
import { requireAuthenticatedSession } from "@/lib/auth";
import { isSaasAdminEmail } from "@/lib/admin";
import { redirect } from "next/navigation";

export default async function MerchantLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireAuthenticatedSession();

  if (!session.merchant.onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <MerchantShell
      merchant={session.merchant}
      user={session.user}
      isSaasAdmin={isSaasAdminEmail(session.user.email)}
    >
      {children}
    </MerchantShell>
  );
}
