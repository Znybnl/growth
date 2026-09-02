import Link from "next/link";

import { CampaignActionsMenu } from "@/components/merchant/campaign-actions-menu";
import { PageHeader } from "@/components/ui/workspace";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAuthenticatedSession } from "@/lib/auth";
import { formatCurrency, formatPercent, gameTypeLabel } from "@/lib/format";
import { getMerchantCampaignOverview } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireAuthenticatedSession();
  const params = await searchParams;
  const query = params.q?.trim().toLowerCase() ?? "";
  const dashboard = await getMerchantCampaignOverview(session.merchant.id, session.merchant);
  const campaigns = query
    ? dashboard.campaigns.filter((item) =>
        `${item.campaign.title} ${item.campaign.subtitle}`.toLowerCase().includes(query),
      )
    : dashboard.campaigns;
  const activeCount = campaigns.filter((item) => item.campaign.isActive).length;

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
          <Link href="/campaigns/new/guided" prefetch={false} className="okado-filled-action px-5">
            Créer une campagne
          </Link>
          </>
        }
      />

      <section className="okado-card p-4 md:p-6">
        <div className="okado-table-header hidden grid-cols-[1.45fr_0.7fr_0.5fr_0.5fr_0.55fr_0.75fr_0.85fr] gap-3 px-5 py-4 lg:grid">
          <span>Campagne</span>
          <span>Jeu</span>
          <span>Scans</span>
          <span>Participations</span>
          <span>Conv.</span>
          <span>Coût / participation</span>
          <span className="sr-only">Actions</span>
        </div>

        <div className="mt-0 space-y-4 lg:mt-4 lg:space-y-0">
          {campaigns.map((item) => (
            <article
              key={item.campaign.id}
              className="rounded-[8px] border border-border bg-linen-canvas p-5 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:border-t lg:bg-transparent lg:px-5 lg:py-5"
            >
              <div className="hidden grid-cols-[1.45fr_0.7fr_0.5fr_0.5fr_0.55fr_0.75fr_0.85fr] items-center gap-3 lg:grid">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <StatusBadge tone={item.campaign.isActive ? "active" : "muted"}>{item.campaign.isActive ? "Active" : "Pause"}</StatusBadge>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-graphite">
                        {item.campaign.title}
                      </p>
                      <p className="truncate text-sm text-ash">{item.campaign.subtitle}</p>
                    </div>
                  </div>
                </div>
                <span className="text-slate">{gameTypeLabel(item.campaign.gameType)}</span>
                <span className="font-semibold text-graphite">{item.kpis.scans}</span>
                <span className="font-semibold text-graphite">{item.kpis.leads}</span>
                <span className="font-semibold text-graphite">
                  {formatPercent(item.kpis.conversionRate)}
                </span>
                <span className="font-semibold text-graphite">
                  {formatCurrency(item.kpis.costPerLead)}
                </span>
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/campaigns/${item.campaign.id}/edit/guided`}
                    prefetch
                    className="okado-primary-action okado-compact-action px-3"
                  >
                    Modifier
                  </Link>
                  <CampaignActionsMenu
                    campaignId={item.campaign.id}
                    campaignTitle={item.campaign.title}
                  />
                </div>
              </div>

              <div className="lg:hidden">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-graphite">{item.campaign.title}</p>
                    <p className="mt-1 text-sm text-ash">{item.campaign.subtitle}</p>
                  </div>
                  <StatusBadge tone={item.campaign.isActive ? "active" : "muted"}>{item.campaign.isActive ? "Active" : "Pause"}</StatusBadge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-[8px] bg-white px-4 py-3">
                    <p className="text-ash">Jeu</p>
                    <p className="mt-1 font-semibold text-graphite">
                      {gameTypeLabel(item.campaign.gameType)}
                    </p>
                  </div>
                  <div className="rounded-[8px] bg-white px-4 py-3">
                    <p className="text-ash">Scans</p>
                    <p className="mt-1 font-semibold text-graphite">{item.kpis.scans}</p>
                  </div>
                  <div className="rounded-[8px] bg-white px-4 py-3">
                    <p className="text-ash">Participations</p>
                    <p className="mt-1 font-semibold text-graphite">{item.kpis.leads}</p>
                  </div>
                  <div className="rounded-[8px] bg-white px-4 py-3">
                    <p className="text-ash">Conversion</p>
                    <p className="mt-1 font-semibold text-graphite">
                      {formatPercent(item.kpis.conversionRate)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-row items-center gap-2 rounded-[8px] border border-border bg-white p-3 lg:hidden">
                <Link
                  href={`/campaigns/${item.campaign.id}/edit/guided`}
                  prefetch={false}
                  className="okado-primary-action min-w-0 flex-1 px-3 text-sm"
                >
                  Modifier
                </Link>

                <CampaignActionsMenu
                  campaignId={item.campaign.id}
                  campaignTitle={item.campaign.title}
                />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
