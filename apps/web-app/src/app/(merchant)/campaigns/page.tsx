import { measureServerStage } from "@/lib/server-performance";
import Link from "next/link";

import { CampaignListTable } from "@/components/merchant/campaign-list-table";
import { CampaignListFilters } from "@/components/merchant/campaign-list-filters";
import { PageHeader } from "@/components/ui/workspace";
import { Button } from "@/components/ui/button";
import { requireAuthenticatedSession } from "@/lib/auth";
import { isSaasAdminEmail } from "@/lib/admin";
import { getMerchantCampaignList } from "@/lib/store";
import { CAMPAIGN_LIST_PAGE_SIZE, CampaignListPagination } from "@/components/merchant/campaign-list-pagination";

export const dynamic = "force-dynamic";

export default async function CampaignsPage(props: Parameters<typeof CampaignsPageContent>[0]) {
  return measureServerStage("page.campaigns", () => CampaignsPageContent(props));
}

async function CampaignsPageContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const session = await requireAuthenticatedSession();
  const params = await searchParams;
  const query = params.q?.trim().toLowerCase() ?? "";
  const list = await getMerchantCampaignList(session.merchant.id, session.merchant);
  const status = ["active", "paused"].includes(params.status ?? "") ? params.status! : "all";
  const matchesQuery = list.filter(item => !query || `${item.title} ${item.subtitle}`.toLowerCase().includes(query));
  const counts = {
    all: matchesQuery.length,
    active: matchesQuery.filter(item => item.isActive).length,
    paused: matchesQuery.filter(item => !item.isActive).length,
  };
  const filtered = matchesQuery.filter(item => status === "all" || item.isActive === (status === "active"));
  const pageCount = Math.max(1, Math.ceil(filtered.length / CAMPAIGN_LIST_PAGE_SIZE));
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(1, requestedPage), pageCount) : 1;
  const campaigns = filtered.slice((page - 1) * CAMPAIGN_LIST_PAGE_SIZE, page * CAMPAIGN_LIST_PAGE_SIZE);
  const allowAdminDuplicate = isSaasAdminEmail(session.user.email);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gestion des animations"
        title="Toutes vos campagnes"
        description="Retrouvez vos jeux en cours et terminés, comparez leurs performances et accédez à leur paramétrage."
        actions={
          <>
          <div className="flex min-h-[var(--okado-action-primary-height)] items-center px-2 text-sm font-semibold text-ash">
            {counts.active} {counts.active === 1 ? "active" : "actives"} · {counts.all} {query ? "résultats" : "au total"}
          </div>
          <Button asChild variant="primary" size="lg">
            <Link href="/campaigns/new/guided" prefetch={false}>Créer une campagne</Link>
          </Button>
          </>
        }
      />

      <CampaignListFilters query={params.q?.trim() ?? ""} status={status} counts={counts} />
      <CampaignListTable campaigns={campaigns} allowAdminDuplicate={allowAdminDuplicate} />
      <CampaignListPagination page={page} total={filtered.length} query={params.q?.trim() ?? ""} status={status} />
    </div>
  );
}
