import Link from "next/link";

import { CampaignActionsMenu } from "@/components/merchant/campaign-actions-menu";
import { requireAuthenticatedSession } from "@/lib/auth";
import { formatCurrency, formatPercent, gameTypeLabel } from "@/lib/format";
import { getMerchantCampaignOverview } from "@/lib/store";

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
      <section className="flex flex-col gap-5 px-1 py-2 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="okado-label">Gestion des animations</p>
          <h1 className="mt-3 font-display text-5xl font-semibold leading-none text-midnight-ink">
            Toutes vos activations
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-ash">
            Retrouvez vos jeux en cours et terminés, comparez leurs performances et accédez à
            leur paramétrage.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-[8px] border border-border bg-linen-canvas px-5 py-4 text-sm text-[#4f5b70]">
            {activeCount} actives · {campaigns.length} au total
          </div>
          <Link
            href="/campaigns/new"
            prefetch={false}
            className="inline-flex items-center justify-center rounded-[12px] bg-[#2f6df6] px-5 py-4 text-sm font-semibold !text-white shadow-[0_16px_32px_rgba(47,109,246,0.22)]"
          >
            Créer une campagne
          </Link>
        </div>
      </section>

      <section className="okado-card p-4 md:p-6">
        <div className="hidden grid-cols-[1.45fr_0.7fr_0.5fr_0.5fr_0.55fr_0.75fr_1.65fr] gap-3 rounded-[8px] bg-linen-canvas px-5 py-4 text-[11px] uppercase tracking-[0.24em] text-[#7b8496] lg:grid">
          <span>Campagne</span>
          <span>Jeu</span>
          <span>Scans</span>
          <span>Leads</span>
          <span>Conv.</span>
          <span>Coût / lead</span>
          <span className="sr-only">Actions</span>
        </div>

        <div className="mt-0 space-y-4 lg:mt-4 lg:space-y-0">
          {campaigns.map((item) => (
            <article
              key={item.campaign.id}
              className="rounded-[8px] border border-border bg-linen-canvas p-5 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:border-t lg:bg-transparent lg:px-5 lg:py-5"
            >
              <div className="hidden grid-cols-[1.45fr_0.7fr_0.5fr_0.5fr_0.55fr_0.75fr_1.65fr] items-center gap-3 lg:grid">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: item.campaign.isActive ? "#12b76a" : "#98a2b3",
                      }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#111827]">
                        {item.campaign.title}
                      </p>
                      <p className="truncate text-sm text-[#7b8496]">{item.campaign.subtitle}</p>
                    </div>
                  </div>
                </div>
                <span className="text-[#556173]">{gameTypeLabel(item.campaign.gameType)}</span>
                <span className="font-semibold text-[#111827]">{item.kpis.scans}</span>
                <span className="font-semibold text-[#111827]">{item.kpis.leads}</span>
                <span className="font-semibold text-[#111827]">
                  {formatPercent(item.kpis.conversionRate)}
                </span>
                <span className="font-semibold text-[#111827]">
                  {formatCurrency(item.kpis.costPerLead)}
                </span>
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/campaigns/${item.campaign.id}/edit`}
                    prefetch={false}
                    className="inline-flex min-h-9 items-center justify-center rounded-[12px] bg-[#2f6df6] px-3 text-sm font-semibold !text-white shadow-[0_14px_26px_rgba(47,109,246,0.18)]"
                  >
                    Modifier
                  </Link>
                  <Link
                    href={`/campaign/${item.campaign.id}`}
                    prefetch={false}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-9 items-center justify-center rounded-[12px] border border-[#d7e0ed] bg-[#fbfcfe] px-3 text-sm font-semibold text-[#182033] transition hover:border-[#c5d2e5] hover:bg-[#f8fbff]"
                  >
                    Prévisualiser
                  </Link>
                  <Link
                    href={`/data?campaign=${item.campaign.id}`}
                    prefetch={false}
                    className="inline-flex min-h-9 items-center justify-center rounded-[12px] border border-[#d7e0ed] bg-[#fbfcfe] px-3 text-sm font-semibold text-[#182033] transition hover:border-[#c5d2e5] hover:bg-[#f8fbff]"
                  >
                    Données
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
                  <div className="rounded-[8px] bg-white px-4 py-3">
                    <p className="text-[#7b8496]">Jeu</p>
                    <p className="mt-1 font-semibold text-[#111827]">
                      {gameTypeLabel(item.campaign.gameType)}
                    </p>
                  </div>
                  <div className="rounded-[8px] bg-white px-4 py-3">
                    <p className="text-[#7b8496]">Scans</p>
                    <p className="mt-1 font-semibold text-[#111827]">{item.kpis.scans}</p>
                  </div>
                  <div className="rounded-[8px] bg-white px-4 py-3">
                    <p className="text-[#7b8496]">Leads</p>
                    <p className="mt-1 font-semibold text-[#111827]">{item.kpis.leads}</p>
                  </div>
                  <div className="rounded-[8px] bg-white px-4 py-3">
                    <p className="text-[#7b8496]">Conversion</p>
                    <p className="mt-1 font-semibold text-[#111827]">
                      {formatPercent(item.kpis.conversionRate)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 rounded-[8px] border border-border bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center lg:hidden">
                <Link
                  href={`/campaigns/${item.campaign.id}/edit`}
                  prefetch={false}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-[12px] bg-[#2f6df6] px-4 py-3 text-sm font-semibold !text-white shadow-[0_14px_26px_rgba(47,109,246,0.20)]"
                >
                  Modifier
                </Link>
                <Link
                  href={`/campaign/${item.campaign.id}`}
                  prefetch={false}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-[12px] border border-[#d7e0ed] bg-[#fbfcfe] px-4 py-3 text-sm font-semibold text-[#182033] transition hover:border-[#c5d2e5] hover:bg-[#f8fbff]"
                >
                  Prévisualiser
                </Link>
                <Link
                  href={`/data?campaign=${item.campaign.id}`}
                  prefetch={false}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-[12px] border border-[#d7e0ed] bg-[#fbfcfe] px-4 py-3 text-sm font-semibold text-[#182033] transition hover:border-[#c5d2e5] hover:bg-[#f8fbff]"
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
