import { measureServerStage } from "@/lib/server-performance";
import Link from "next/link";

import { CampaignListTable } from "@/components/merchant/campaign-list-table";
import { PageHeader } from "@/components/ui/workspace";
import { Button } from "@/components/ui/button";
import { requireAuthenticatedSession } from "@/lib/auth";
import { isSaasAdminEmail } from "@/lib/admin";
import { getMerchantCampaignList } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function CampaignsPage(props: Parameters<typeof CampaignsPageContent>[0]) {
  return measureServerStage("page.campaigns", () => CampaignsPageContent(props));
}

async function CampaignsPageContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireAuthenticatedSession();
  const params = await searchParams;
  const query = params.q?.trim().toLowerCase() ?? "";
  const list = await getMerchantCampaignList(session.merchant.id, session.merchant);
  const campaigns = query
    ? list.filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(query))
    : list;
  const activeCount = campaigns.filter((item) => item.isActive).length;
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
            {activeCount} actives · {campaigns.length} au total
          </div>
          <Button asChild variant="primary" size="lg">
            <Link href="/campaigns/new/guided" prefetch={false}>Créer une campagne</Link>
          </Button>
          </>
        }
      />

      <CampaignListTable campaigns={campaigns} allowAdminDuplicate={allowAdminDuplicate} />
    </div>
  );
}
