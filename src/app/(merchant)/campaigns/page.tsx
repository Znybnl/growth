import Link from "next/link";

import { CampaignActionsMenu } from "@/components/merchant/campaign-actions-menu";
import { requireAuthenticatedSession } from "@/lib/auth";
import { formatCurrency, formatPercent, gameTypeLabel, goalLabel } from "@/lib/format";
import { getMerchantDashboard } from "@/lib/store";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireAuthenticatedSession();
  const params = await searchParams;
  const query = params.q?.trim().toLowerCase() ?? "";
  const dashboard = await getMerchantDashboard(session.merchant.id, session.merchant);
  const campaigns = query
    ? dashboard.campaigns.filter((item) =>
        `${item.campaign.title} ${item.campaign.subtitle}`.toLowerCase().includes(query),
      )
    : dashboard.campaigns;
  const activeCount = campaigns.filter((item) => item.campaign.isActive).length;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[34px] border border-[#dbe4f0] bg-white shadow-[0_20px_50px_rgba(122,136,166,0.14)]">
        <div className="flex flex-col gap-5 px-6 py-7 xl:flex-row xl:items-end xl:justify-between xl:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
              Gestion des campagnes
            </p>
            <h1 className="mt-3 font-display text-5xl font-semibold leading-none text-[#0f1728]">
              Toutes vos activations
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5c6577]">
              Retrouvez les campagnes actives et passées, comparez leurs performances et accédez
              directement au paramétrage ou au parcours public.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-[22px] bg-[#f7f9fc] px-5 py-4 text-sm text-[#4f5b70]">
              {activeCount} actives · {campaigns.length} au total
            </div>
            <Link
              href="/campaigns/new"
              className="inline-flex items-center justify-center rounded-[22px] bg-[#2f6df6] px-5 py-4 text-sm font-semibold !text-white shadow-[0_16px_32px_rgba(47,109,246,0.22)]"
            >
              Créer une campagne
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-[#dbe4f0] bg-white p-4 shadow-[0_18px_44px_rgba(122,136,166,0.1)] md:p-6">
        <div className="hidden grid-cols-[1.6fr_0.8fr_0.85fr_0.65fr_0.7fr_0.7fr_0.9fr] gap-3 rounded-[24px] bg-[#f7f9fc] px-5 py-4 text-[11px] uppercase tracking-[0.24em] text-[#7b8496] lg:grid">
          <span>Campagne</span>
          <span>Objectif</span>
          <span>Jeu</span>
          <span>Leads</span>
          <span>Actions</span>
          <span>Conv.</span>
          <span>Coût / lead</span>
        </div>

        <div className="mt-0 space-y-4 lg:mt-4 lg:space-y-0">
          {campaigns.map((item) => (
            <article
              key={item.campaign.id}
              className="rounded-[28px] border border-[#e4eaf2] bg-[#fbfcfe] p-5 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:border-t lg:bg-transparent lg:px-5 lg:py-5"
            >
              <div className="hidden grid-cols-[1.6fr_0.8fr_0.85fr_0.65fr_0.7fr_0.7fr_0.9fr] items-center gap-3 lg:grid">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.campaign.accent.signal }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#111827]">
                        {item.campaign.title}
                      </p>
                      <p className="truncate text-sm text-[#7b8496]">{item.campaign.subtitle}</p>
                    </div>
                  </div>
                </div>
                <span className="text-[#556173]">{goalLabel(item.campaign.goalType)}</span>
                <span className="text-[#556173]">{gameTypeLabel(item.campaign.gameType)}</span>
                <span className="font-semibold text-[#111827]">{item.kpis.leads}</span>
                <span className="font-semibold text-[#111827]">{item.kpis.actions}</span>
                <span className="font-semibold text-[#111827]">
                  {formatPercent(item.kpis.conversionRate)}
                </span>
                <span className="font-semibold text-[#111827]">
                  {formatCurrency(item.kpis.costPerLead)}
                </span>
              </div>

              <div className="lg:hidden">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[#111827]">{item.campaign.title}</p>
                    <p className="mt-1 text-sm text-[#7b8496]">{item.campaign.subtitle}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-2 text-[11px] uppercase tracking-[0.24em] ${
                      item.campaign.isActive
                        ? "bg-[#ddf3e7] text-[#1f7d53]"
                        : "bg-[#eef1f5] text-[#778092]"
                    }`}
                  >
                    {item.campaign.isActive ? "Active" : "En pause"}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-[18px] bg-white px-4 py-3">
                    <p className="text-[#7b8496]">Objectif</p>
                    <p className="mt-1 font-semibold text-[#111827]">
                      {goalLabel(item.campaign.goalType)}
                    </p>
                  </div>
                  <div className="rounded-[18px] bg-white px-4 py-3">
                    <p className="text-[#7b8496]">Jeu</p>
                    <p className="mt-1 font-semibold text-[#111827]">
                      {gameTypeLabel(item.campaign.gameType)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-start gap-3">
                <Link
                  href={`/campaigns/${item.campaign.id}/edit`}
                  className="rounded-[18px] bg-[#2f6df6] px-4 py-3 text-sm font-semibold !text-white shadow-[0_16px_32px_rgba(47,109,246,0.22)]"
                >
                  Modifier
                </Link>
                <Link
                  href={`/campaign/${item.campaign.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[18px] border border-[#d7e0ed] px-4 py-3 text-sm font-semibold text-[#182033]"
                >
                  Ouvrir
                </Link>
                <Link
                  href={`/data?campaign=${item.campaign.id}`}
                  className="rounded-[18px] border border-[#d7e0ed] px-4 py-3 text-sm font-semibold text-[#182033]"
                >
                  Données
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
