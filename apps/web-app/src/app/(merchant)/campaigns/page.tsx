import Link from "next/link";

import { CampaignActionsMenu } from "@/components/merchant/campaign-actions-menu";
import { EmptyState, PageHeader, ResponsiveTable } from "@/components/ui/workspace";
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

      <section>
        <ResponsiveTable
          mobile={
            campaigns.length ? (
              <div className="okado-mobile-table-list">
                {campaigns.map((item) => (
                  <article key={item.campaign.id} className="okado-mobile-table-row">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-graphite">{item.campaign.title}</p>
                        <p className="mt-1 truncate text-sm text-ash">{item.campaign.subtitle}</p>
                      </div>
                      <StatusBadge tone={item.campaign.isActive ? "active" : "muted"}>{item.campaign.isActive ? "Active" : "Pause"}</StatusBadge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      {[
                        ["Jeu", gameTypeLabel(item.campaign.gameType)],
                        ["Scans", item.kpis.scans],
                        ["Participations", item.kpis.leads],
                        ["Conversion", formatPercent(item.kpis.conversionRate)],
                      ].map(([label, value]) => (
                        <div key={label} className="okado-mobile-table-stat">
                          <p className="okado-mobile-table-stat-label">{label}</p>
                          <p className="mt-1 okado-mobile-table-stat-value">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                      <Link href={`/campaigns/${item.campaign.id}/edit/guided`} prefetch={false} className="okado-primary-action min-w-0 flex-1 px-3 text-sm">Modifier</Link>
                      <CampaignActionsMenu campaignId={item.campaign.id} campaignTitle={item.campaign.title} />
                    </div>
                  </article>
                ))}
              </div>
            ) : <EmptyState title="Aucune campagne trouvée" description="Modifiez votre recherche ou créez une nouvelle campagne." />
          }
        >
          <div className="okado-table-header grid grid-cols-[1.45fr_0.7fr_0.5fr_0.5fr_0.55fr_0.75fr_0.85fr] gap-3 px-5 py-3">
            <span>Campagne</span><span>Jeu</span><span>Scans</span><span>Participations</span><span>Conv.</span><span>Coût / participation</span><span className="sr-only">Actions</span>
          </div>
          <div className="space-y-0">
            {campaigns.length ? campaigns.map((item) => (
              <div key={item.campaign.id} className="okado-table-row grid grid-cols-[1.45fr_0.7fr_0.5fr_0.5fr_0.55fr_0.75fr_auto] items-center gap-3 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3"><StatusBadge tone={item.campaign.isActive ? "active" : "muted"}>{item.campaign.isActive ? "Active" : "Pause"}</StatusBadge><div className="min-w-0"><p className="truncate font-semibold text-graphite">{item.campaign.title}</p><p className="truncate text-sm text-ash">{item.campaign.subtitle}</p></div></div>
                <span className="text-slate">{gameTypeLabel(item.campaign.gameType)}</span>
                <span data-align="right" className="font-semibold text-graphite">{item.kpis.scans}</span>
                <span data-align="right" className="font-semibold text-graphite">{item.kpis.leads}</span>
                <span data-align="right" className="font-semibold text-graphite">{formatPercent(item.kpis.conversionRate)}</span>
                <span data-align="right" className="font-semibold text-graphite">{formatCurrency(item.kpis.costPerLead)}</span>
                <div className="flex items-center justify-end gap-2"><Link href={`/campaigns/${item.campaign.id}/edit/guided`} prefetch className="okado-primary-action okado-compact-action px-3">Modifier</Link><CampaignActionsMenu campaignId={item.campaign.id} campaignTitle={item.campaign.title} /></div>
              </div>
            )) : <EmptyState title="Aucune campagne trouvée" description="Modifiez votre recherche ou créez une nouvelle campagne." />}
          </div>
        </ResponsiveTable>
      </section>
    </div>
  );
}
