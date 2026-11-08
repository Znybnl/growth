import { notFound } from "next/navigation";
import { CampaignListTable } from "@/components/merchant/campaign-list-table";
import { CampaignListFilters } from "@/components/merchant/campaign-list-filters";
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

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  const query = params.q?.toLowerCase() ?? "";
  const filtered = campaigns.filter(item => `${item.title} ${item.subtitle}`.toLowerCase().includes(query) &&
    (!params.status || params.status === "all" || item.isActive === (params.status === "active")));
  return (
    <MerchantShell merchant={merchant}
      user={{ id: "campaign-list-user", merchantId: merchant.id, firstName: "Camille", lastName: "Test",
        email: "campaign-list@example.test", password: "", createdAt: merchant.createdAt }}
      locations={[{ merchant, role: "owner" }]} activeLocationId={merchant.id} isSaasAdmin={false}>
      <div className="space-y-6">
        <PageHeader eyebrow="Gestion des animations" title="Toutes vos campagnes" />
        <CampaignListFilters query={params.q ?? ""} status={params.status ?? "all"} action="/dev/campaign-list-proof" />
        <CampaignListTable campaigns={filtered} />
      </div>
    </MerchantShell>
  );
}
