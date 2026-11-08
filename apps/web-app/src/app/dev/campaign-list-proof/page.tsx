import { notFound } from "next/navigation";
import { CampaignListTable } from "@/components/merchant/campaign-list-table";
import { CampaignListFilters } from "@/components/merchant/campaign-list-filters";
import { MerchantShell } from "@/components/merchant/merchant-shell";
import { PageHeader } from "@/components/ui/workspace";
import type { CampaignListItem } from "@/lib/types";
import { CAMPAIGN_LIST_PAGE_SIZE, CampaignListPagination } from "@/components/merchant/campaign-list-pagination";

const merchant = {
  id: "campaign-list-proof", companyName: "Établissement de test", logoText: "Démo",
  onboardingCompleted: true, createdAt: "2026-11-06T09:00:00Z",
};
const campaigns: CampaignListItem[] = [
  { id: "wheel", title: "Roue de bienvenue", subtitle: "Lots de démonstration", gameType: "wheel", isActive: true, games: 12345678, wins: 4, redeemed: 2 },
  { id: "scratch", title: "Ticket du samedi au nom volontairement très long", subtitle: "Une surprise fictive à gagner", gameType: "scratch", isActive: false, games: 4, wins: 0, redeemed: 0 },
  ...Array.from({ length: 38 }, (_, index) => ({
    id: `campaign-${index + 3}`,
    title: `Jeu de démonstration ${String(index + 3).padStart(2, "0")}`,
    subtitle: "Une campagne fictive pour le contrôle des longues listes",
    gameType: index % 2 ? "wheel" as const : "scratch" as const,
    isActive: index % 3 !== 1,
    games: index * 23,
    wins: index % 5,
    redeemed: index % 3,
  })),
];

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  const query = params.q?.toLowerCase() ?? "";
  const matchesQuery = campaigns.filter(item => `${item.title} ${item.subtitle}`.toLowerCase().includes(query));
  const status = params.status === "active" || params.status === "paused" ? params.status : "all";
  const counts = {
    all: matchesQuery.length,
    active: matchesQuery.filter(item => item.isActive).length,
    paused: matchesQuery.filter(item => !item.isActive).length,
  };
  const filtered = matchesQuery.filter(item => status === "all" || item.isActive === (status === "active"));
  const pageCount = Math.max(1, Math.ceil(filtered.length / CAMPAIGN_LIST_PAGE_SIZE));
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(1, requestedPage), pageCount) : 1;
  const visible = filtered.slice((page - 1) * CAMPAIGN_LIST_PAGE_SIZE, page * CAMPAIGN_LIST_PAGE_SIZE);
  return (
    <MerchantShell merchant={merchant}
      user={{ id: "campaign-list-user", merchantId: merchant.id, firstName: "Camille", lastName: "Test",
        email: "campaign-list@example.test", password: "", createdAt: merchant.createdAt }}
      locations={[{ merchant, role: "owner" }]} activeLocationId={merchant.id} isSaasAdmin={false}>
      <div className="space-y-6">
        <PageHeader eyebrow="Gestion des animations" title="Toutes vos campagnes" />
        <CampaignListFilters query={params.q ?? ""} status={status} counts={counts} action="/dev/campaign-list-proof" />
        <CampaignListTable campaigns={visible} />
        <CampaignListPagination page={page} total={filtered.length} query={params.q ?? ""} status={status} action="/dev/campaign-list-proof" />
      </div>
    </MerchantShell>
  );
}
