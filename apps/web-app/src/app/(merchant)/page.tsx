import Link from "next/link";
import { ArrowRight, CircleStop, Gift, PackageCheck, PackageX, Pause, Play, TriangleAlert } from "lucide-react";

import { DashboardActivityChart } from "@/components/merchant/dashboard-activity-chart";
import { DashboardCampaignActionsMenu } from "@/components/merchant/dashboard-campaign-actions-menu";
import { DashboardOperationalAlerts } from "@/components/merchant/dashboard-operational-alerts";
import { OnboardingWelcomeDialog } from "@/components/merchant/onboarding-welcome-dialog";
import { EmptyState, MetricCard, PageHeader } from "@/components/ui/workspace";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAuthenticatedSession } from "@/lib/auth";
import {
  formatDateTime,
  formatPercent,
  gameTypeLabel,
  leadStatusLabel,
} from "@/lib/format";
import { getMerchantDashboard, getMerchantRecentLeads, getMerchantWorkspaceDashboard } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; scope?: string; welcome?: string }>;
}) {
  const session = await requireAuthenticatedSession();
  const params = await searchParams;
  const query = params.q?.trim().toLowerCase() ?? "";
  const isWorkspaceView = params.scope === "all" && session.locations.length > 1;
  const [dashboard, merchantLeads] = await Promise.all([
    isWorkspaceView
      ? getMerchantWorkspaceDashboard(session.user.id, session.merchant)
      : getMerchantDashboard(session.merchant.id, session.merchant),
    isWorkspaceView ? Promise.resolve([]) : getMerchantRecentLeads(session.merchant.id, 5, query),
  ]);

  const filteredCampaigns = query
    ? dashboard.campaigns.filter((item) =>
        `${item.campaign.title} ${item.campaign.subtitle}`.toLowerCase().includes(query),
      )
    : dashboard.campaigns;

  const merchantCampaignIds = new Set(filteredCampaigns.map((item) => item.campaign.id));
  const recentLeads = merchantLeads.filter((lead) => merchantCampaignIds.has(lead.campaignId));

  const activeCampaigns = filteredCampaigns.filter((item) => item.campaign.isActive);
  const campaignsForTable = [...filteredCampaigns].sort((a, b) =>
    b.campaign.createdAt.localeCompare(a.campaign.createdAt),
  );
  const stockState = (item: (typeof dashboard.prizeInventory)[number]) => {
    if (item.remainingQuantity === 0) {
      return { label: "Épuisé", tone: "danger", icon: PackageX } as const;
    }

    if (
      item.remainingQuantity !== null &&
      item.totalQuantity !== null &&
      item.totalQuantity > 0 &&
      item.remainingQuantity <= Math.max(1, Math.ceil(item.totalQuantity * 0.1))
    ) {
      return { label: "Stock faible", tone: "warning", icon: TriangleAlert } as const;
    }

    return { label: "Disponible", tone: "success", icon: PackageCheck } as const;
  };
  const activityPoints = dashboard.activityPoints;
  const getCampaignStatus = (item: (typeof filteredCampaigns)[number]) => {
    if (!item.campaign.isActive) {
      return {
        label: "Campagne en pause",
        icon: Pause,
        iconClass: "text-[var(--okado-text-muted)]",
      };
    }

    if (item.prizes.length > 0 && item.prizes.every((prize) => prize.remainingQuantity === 0)) {
      return {
        label: "Campagne arrêtée : stock épuisé",
        icon: CircleStop,
        iconClass: "text-[var(--okado-status-warning-text)]",
      };
    }

    return {
      label: "Campagne active",
      icon: Play,
      iconClass: "text-[var(--okado-status-success-text)]",
    };
  };
  const CampaignStatusIcon = ({ item }: { item: (typeof filteredCampaigns)[number] }) => {
    const status = getCampaignStatus(item);
    const Icon = status.icon;

    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center ${status.iconClass}`}
        role="img"
        aria-label={status.label}
        title={status.label}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden="true" />
      </span>
    );
  };
  const leadStatusTone = (status: (typeof recentLeads)[number]["status"]) => {
    switch (status) {
      case "redeemed":
        return "active" as const;
      case "claimed":
        return "info" as const;
      case "lost":
        return "muted" as const;
      case "expired":
        return "warning" as const;
      default:
        return "muted" as const;
    }
  };

  return (
    <div className="min-w-0 space-y-5 overflow-x-hidden">
      <OnboardingWelcomeDialog open={params.welcome === "1"} />
      <PageHeader
        eyebrow="Vue d'ensemble"
        title="Pilotez vos campagnes"
        description="Suivez vos campagnes en direct, comparez les mécaniques qui performent et lancez rapidement une nouvelle campagne."
        actions={
          <>
            {session.locations.length > 1 ? (
              <Link
                href={isWorkspaceView ? "/" : "/?scope=all"}
                prefetch={false}
                className="okado-secondary-action px-5"
              >
                {isWorkspaceView ? "Voir le site actif" : "Tous les sites"}
              </Link>
            ) : null}
            <Link
              href="/campaigns/new/guided"
              prefetch={false}
              className="okado-filled-action px-5"
            >
              Créer une campagne
            </Link>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Campagnes actives", String(activeCampaigns.length)],
          [
            "Participations totales",
            String(filteredCampaigns.reduce((total, item) => total + item.kpis.leads, 0)),
          ],
          [
            "Lots retirés",
            String(filteredCampaigns.reduce((total, item) => total + item.kpis.redeemed, 0)),
          ],
          [
            "Conversion moyenne",
            formatPercent(
              filteredCampaigns.length
                ? Math.round(
                    filteredCampaigns.reduce(
                      (total, item) => total + item.kpis.conversionRate,
                      0,
                    ) / filteredCampaigns.length,
                  )
                : 0,
            ),
          ],
        ].map(([label, value]) => <MetricCard key={label} label={label} value={value} />)}
      </section>

      <DashboardOperationalAlerts />

      <section className="min-w-0 space-y-6">
        <DashboardActivityChart
          eyebrow="Activité récente"
          title="Scans et participations par jour"
          points={activityPoints}
        />

        <section className="okado-card min-w-0 p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0"><p className="okado-label">Toutes les campagnes</p><h2 className="okado-section-title mt-2">Vos dernières campagnes</h2></div>
          <div className="flex items-center gap-4"><span className="text-sm text-ash">{campaignsForTable.length} {campaignsForTable.length === 1 ? "campagne" : "campagnes"}</span><Link href="/campaigns" prefetch className="okado-link text-sm">Voir toutes les campagnes</Link></div>
        </div>
        {campaignsForTable.length ? (
          <div className="mt-6 max-h-[380px] overflow-y-auto pr-1">
            <div className="hidden min-w-[680px] 2xl:block">
              <div className="okado-table-header sticky top-0 z-10 grid grid-cols-[minmax(0,1.65fr)_0.7fr_0.8fr_0.9fr_auto] items-center gap-3 px-4 py-3"><span>Campagne</span><span className="text-right">Scans</span><span className="text-right">Participations</span><span className="text-right">Conversion</span><span className="sr-only">Actions</span></div>
              {campaignsForTable.map((item) => <div key={item.campaign.id} className="okado-table-row grid grid-cols-[minmax(0,1.65fr)_0.7fr_0.8fr_0.9fr_auto] items-center gap-3 px-4 py-4 text-sm"><div className="flex min-w-0 items-center gap-3"><CampaignStatusIcon item={item} /><div className="min-w-0"><p className="truncate font-semibold text-carbon">{item.campaign.title}</p><p className="truncate text-ash">{gameTypeLabel(item.campaign.gameType)}</p></div></div><span data-align="right" className="font-semibold text-graphite">{item.kpis.scans}</span><span data-align="right" className="font-semibold text-graphite">{item.kpis.leads}</span><span data-align="right" className="font-semibold text-graphite">{formatPercent(item.kpis.conversionRate)}</span><DashboardCampaignActionsMenu campaignId={item.campaign.id} /></div>)}
            </div>
            <div className="space-y-0 2xl:hidden">{campaignsForTable.map((item) => <article key={item.campaign.id} className="okado-mobile-table-row"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><CampaignStatusIcon item={item} /><div className="min-w-0"><p className="truncate font-semibold text-graphite">{item.campaign.title}</p><p className="truncate text-sm text-ash">{gameTypeLabel(item.campaign.gameType)}</p></div></div><DashboardCampaignActionsMenu campaignId={item.campaign.id} /></div><div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm"><div className="okado-mobile-table-stat"><p className="okado-mobile-table-stat-label">Conversion</p><p className="mt-1 okado-mobile-table-stat-value">{formatPercent(item.kpis.conversionRate)}</p></div><div className="okado-mobile-table-stat"><p className="okado-mobile-table-stat-label">Participations</p><p className="mt-1 okado-mobile-table-stat-value">{item.kpis.leads}</p></div><div className="okado-mobile-table-stat"><p className="okado-mobile-table-stat-label">Scans</p><p className="mt-1 okado-mobile-table-stat-value">{item.kpis.scans}</p></div></div></article>)}</div>
          </div>
        ) : <EmptyState title="Aucune campagne trouvée" description="Créez une campagne pour suivre ses performances ici." />}
        </section>
      </section>

      <section className="okado-card min-w-0 p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><p className="okado-label">Dernières saisies</p><h2 className="okado-section-title mt-2">Participations récentes</h2></div><Link href="/data" prefetch={false} className="okado-link text-sm">Ouvrir les données</Link></div>
        {recentLeads.length ? <div className="mt-6">
          <div className="hidden overflow-x-auto md:block"><div className="min-w-[760px]"><div className="okado-table-header grid grid-cols-[minmax(140px,1fr)_minmax(160px,1.15fr)_minmax(150px,1fr)_120px_150px] items-center gap-4 px-4 py-3"><span>Participant</span><span>Campagne</span><span>Lot remporté</span><span>Statut</span><span>Date</span></div>{recentLeads.map((lead) => <div key={lead.id} className="okado-table-row grid grid-cols-[minmax(140px,1fr)_minmax(160px,1.15fr)_minmax(150px,1fr)_120px_150px] items-center gap-4 px-4 py-4 text-sm"><div className="min-w-0"><p className="truncate font-semibold text-carbon">{lead.firstName}</p><p className="truncate text-ash">{lead.email}</p></div><span className="truncate text-ash">{lead.campaignTitle}</span><span className="truncate text-graphite">{lead.prizeLabel}</span><StatusBadge tone={leadStatusTone(lead.status)}>{leadStatusLabel(lead.status)}</StatusBadge><span className="text-ash">{formatDateTime(lead.createdAt)}</span></div>)}</div></div>
          <div className="space-y-0 md:hidden">{recentLeads.map((lead) => <article key={lead.id} className="okado-mobile-table-row"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-carbon">{lead.firstName}</p><p className="truncate text-sm text-ash">{lead.email}</p></div><StatusBadge tone={leadStatusTone(lead.status)}>{leadStatusLabel(lead.status)}</StatusBadge></div><dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm"><div><dt className="okado-mobile-table-stat-label">Campagne</dt><dd className="mt-1 truncate text-graphite">{lead.campaignTitle}</dd></div><div><dt className="okado-mobile-table-stat-label">Lot remporté</dt><dd className="mt-1 truncate text-graphite">{lead.prizeLabel}</dd></div><div><dt className="okado-mobile-table-stat-label">Date</dt><dd className="mt-1 text-graphite">{formatDateTime(lead.createdAt)}</dd></div></dl></article>)}</div>
        </div> : <div className="mt-6"><EmptyState title="Aucune participation récente" description="Les dernières participations de vos campagnes apparaîtront ici." /></div>}
      </section>

      <section className="okado-card min-w-0 p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="okado-label">Stocks et retraits</p>
            <h2 className="okado-section-title mt-2">Lots à remettre et stock disponible</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ash">
              Retrouvez les gains qui attendent un retrait et le stock restant pour chaque lot.
            </p>
          </div>
          <Link href="/caisse" prefetch={false} className="okado-link inline-flex items-center gap-2 text-sm">
            Voir les retraits <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        {dashboard.prizeInventory.length ? (
          <>
            <div className="mt-6 hidden overflow-x-auto md:block">
              <div className="min-w-[680px]">
                <div className="okado-table-header grid grid-cols-[minmax(180px,1.1fr)_minmax(180px,1fr)_110px_130px_120px] items-center gap-4 px-4 py-3">
                  <span>Lot</span><span>Campagne</span><span className="text-right">À retirer</span><span className="text-right">Stock restant</span><span>État</span>
                </div>
                {dashboard.prizeInventory.map((item) => {
                  const state = stockState(item);
                  const StateIcon = state.icon;
                  return (
                    <div key={item.prizeId} className="okado-table-row grid grid-cols-[minmax(180px,1.1fr)_minmax(180px,1fr)_110px_130px_120px] items-center gap-4 px-4 py-4 text-sm">
                      <div className="flex min-w-0 items-center gap-3"><Gift className="size-4 shrink-0 text-aubergine" aria-hidden="true" /><span className="truncate font-semibold text-carbon">{item.prizeLabel}</span></div>
                      <span className="truncate text-ash">{item.campaignTitle}</span>
                      <span data-align="right" className="font-semibold text-graphite">{item.pendingRedemptions}</span>
                      <span data-align="right" className="font-semibold text-graphite">{item.remainingQuantity === null ? "Illimité" : `${item.remainingQuantity}${item.totalQuantity === null ? "" : ` / ${item.totalQuantity}`}`}</span>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${state.tone === "danger" ? "text-coral-alert" : state.tone === "warning" ? "text-amber-700" : "text-emerald-700"}`}><StateIcon className="size-4" aria-hidden="true" />{state.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-5 space-y-0 md:hidden">
              {dashboard.prizeInventory.map((item) => {
                const state = stockState(item);
                const StateIcon = state.icon;
                return (
                  <article key={item.prizeId} className="border-b border-fog py-4 first:pt-0 last:border-b-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><Gift className="mt-0.5 size-4 shrink-0 text-aubergine" aria-hidden="true" /><div className="min-w-0"><p className="truncate font-semibold text-carbon">{item.prizeLabel}</p><p className="mt-1 truncate text-sm text-ash">{item.campaignTitle}</p></div></div><span className={`inline-flex shrink-0 items-center gap-1 text-xs font-semibold ${state.tone === "danger" ? "text-coral-alert" : state.tone === "warning" ? "text-amber-700" : "text-emerald-700"}`}><StateIcon className="size-4" aria-hidden="true" />{state.label}</span></div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="okado-mobile-table-stat-label">À retirer</p><p className="mt-1 okado-mobile-table-stat-value">{item.pendingRedemptions}</p></div><div><p className="okado-mobile-table-stat-label">Stock restant</p><p className="mt-1 okado-mobile-table-stat-value">{item.remainingQuantity === null ? "Illimité" : item.remainingQuantity}</p></div></div>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <div className="mt-6"><EmptyState title="Aucun lot configuré" description="Les lots de vos jeux apparaîtront ici dès qu’une campagne en contient." /></div>
        )}
      </section>
    </div>
  );
}

