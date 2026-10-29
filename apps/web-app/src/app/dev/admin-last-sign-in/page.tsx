import { notFound } from "next/navigation";
import { AdminDashboard } from "@/components/merchant/admin-dashboard";
import { MerchantShell } from "@/components/merchant/merchant-shell";
import type { SaasAdminOverview } from "@/lib/admin-repository";

export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  const merchant = { id: "demo", companyName: "Institut de démonstration", logoText: "Démo",
    onboardingCompleted: true, createdAt: "2026-10-01T12:00Z" };
  const overview: SaasAdminOverview = {
    totals: { accounts: 1, merchants: 3, onboardedMerchants: 2, activeSubscriptions: 2, activeCampaigns: 4,
      leads: 18, pendingRewards: 6, lowStockPrizes: 0, failedRewardEmails: 0 },
    users: [
      { status: "available", at: "2026-10-24T23:30:00.000Z" } as const,
      { status: "never" } as const, { status: "unavailable" } as const,
    ].map((lastSignIn, i) => ({ id: `demo-${i}`, merchantId: "demo", merchantName: merchant.companyName,
      firstName: "Camille", lastName: `Démonstration ${i + 1}`, email: `camille.demonstration.${i}@example.test`,
      createdAt: merchant.createdAt, lastSignIn, onboardingCompleted: i !== 1,
      subscriptionStatus: null, stripeSubscriptionId: null, trialEndDate: null, subscriptionCurrentPeriodEnd: null,
      subscriptionCancelAtPeriodEnd: false, campaignCount: 4, leadCount: 18,
      lowStockCount: 0, exhaustedStockCount: 0, failedEmailCount: 0 })),
  };
  return <MerchantShell merchant={merchant}
    user={{ id: "admin-demo", merchantId: "demo", firstName: "Camille", lastName: "Démo",
      email: "camille@example.test", password: "", createdAt: merchant.createdAt }}
    locations={[{ merchant, role: "owner" }]} activeLocationId="demo" isSaasAdmin>
    <AdminDashboard overview={overview} />
  </MerchantShell>;
}
