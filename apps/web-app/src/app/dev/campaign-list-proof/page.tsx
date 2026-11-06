import { notFound } from "next/navigation";
import { CampaignListTable } from "@/components/merchant/campaign-list-table";
import { MerchantShell } from "@/components/merchant/merchant-shell";
import { PageHeader } from "@/components/ui/workspace";
import type { CampaignListItem } from "@/lib/types";

const merchant = {
  id: "campaign-list-proof", companyName: "Établissement de test", logoText: "Démo",
  onboardingCompleted: true, createdAt: "2026-11-06T09:00:00Z",
};
const campaigns: CampaignListItem[] = [
  { id: "wheel", title: "Roue de bienvenue", subtitle: "Lots de démonstration", gameType: "wheel", isActive: true, games: 12345678, wins: 4, redeemed: 2 },
  { id: "scratch", title: "Ticket du samedi au nom volontairement très long", subtitle: "Une surprise fictive à gagner", gameType: "scratch", isActive: false, games: 4, wins: 0, redeemed: 0 },
];

export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <MerchantShell merchant={merchant}
      user={{ id: "campaign-list-user", merchantId: merchant.id, firstName: "Camille", lastName: "Test",
        email: "campaign-list@example.test", password: "", createdAt: merchant.createdAt }}
      locations={[{ merchant, role: "owner" }]} activeLocationId={merchant.id} isSaasAdmin={false}>
      <div className="space-y-6">
        <PageHeader eyebrow="Gestion des animations" title="Toutes vos campagnes" />
        <CampaignListTable campaigns={campaigns} />
      </div>
    </MerchantShell>
  );
}
