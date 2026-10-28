"use client";
import { AffiliateAdminScreen } from "@/components/merchant/affiliate-admin-screen";
import { AccountSettingsForm } from "@/components/merchant/account-settings-form";
import { MerchantShell } from "@/components/merchant/merchant-shell";
import { PageHeader } from "@/components/ui/workspace";
import { getMerchantBillingSummary } from "@/lib/billing";
import type { AffiliateAdminAccountItem, AffiliateSummary, Merchant } from "@/lib/types";

const merchant: Merchant = { id: "fixture-site-2", workspaceId: "fixture-workspace", companyName: "Maison Douceur — deuxième site", logoText: "Maison Douceur",
  industry: "Beauté", createdAt: "2026-10-28T10:00:00Z", onboardingCompleted: true };
const user = { id: "fixture-user", merchantId: "fixture-site-1", role: "owner" as const, firstName: "Camille", lastName: "Durand",
  email: "camille@example.test", password: "", createdAt: merchant.createdAt };
const accounts: AffiliateAdminAccountItem[] = [
  { id: "workspace:new-account", workspaceId: "new-account", merchantId: "new-site", merchantName: "Nouvelle Inscription", merchantEmail: "nouvelle.inscription@example.test",
    workspaceName: "Nouvel institut", locationCount: 1, createdAt: merchant.createdAt, code: "À générer à l’activation", status: "disabled",
    commissionRateBps: 4000, commissionDurationMonths: 12, referralCount: 0, pendingCommissionCents: 0, paidCommissionCents: 0 },
  { id: "affiliate-account", workspaceId: "fixture-workspace", merchantId: user.merchantId, merchantName: "Camille Durand", merchantEmail: user.email,
    workspaceName: "Maison Douceur", locationCount: 3, createdAt: "2026-06-10T10:00:00Z", code: "OKADO-CAMILLE", status: "active",
    commissionRateBps: 4000, commissionDurationMonths: 12, referralCount: 1, pendingCommissionCents: 8000, paidCommissionCents: 0 },
];
const summary: AffiliateSummary = { account: { id: "affiliate-account", workspaceId: "fixture-workspace", merchantId: user.merchantId,
  code: "OKADO-CAMILLE", status: "active", commissionRateBps: 4000, commissionDurationMonths: 12, createdAt: user.createdAt, updatedAt: user.createdAt },
  referralLinkPath: "/inscription?ref=OKADO-CAMILLE", totals: { referrals: 1, activeReferrals: 1, pendingCommissionCents: 8000, paidCommissionCents: 0, totalCommissionCents: 8000 },
  referrals: [{ id: "referral", affiliateMerchantId: user.merchantId, referredMerchantId: "referred-site", referredMerchantName: "Institut de démonstration",
    status: "active", createdAt: "2026-01-15T10:00:00Z", firstSubscriptionPaidAt: "2026-01-15T10:00:00Z", commissionEligibleUntil: "2027-01-15T10:00:00Z",
    totalCommissionCents: 8000, paidCommissionCents: 0, pendingCommissionCents: 8000 }] };
export function AffiliateAccountsFixture({ account, enabled }: { account: boolean; enabled: boolean }) {
  return <MerchantShell merchant={merchant} user={user} locations={[{ merchant, role: "owner" }]} activeLocationId={merchant.id} isSaasAdmin={!account}>
    <div className="min-w-0 space-y-6">
      {account ? <PageHeader eyebrow="Compte marchand" title="Mon compte" description="Réglages de votre compte et de vos établissements." /> : null}
      {account ? <AccountSettingsForm merchant={merchant} user={user} locations={[{ merchant, role: "owner" }]}
        redemptionPinStates={{}} billing={getMerchantBillingSummary(merchant)} affiliateSummary={enabled ? summary : null} />
        : <AffiliateAdminScreen overview={{ accounts, commissions: [], totals: { affiliates: 2, activeAffiliates: 1, referrals: 1, pendingCommissionCents: 8000, payableCommissionCents: 0, paidCommissionCents: 0 } }} />}
    </div>
  </MerchantShell>;
}
