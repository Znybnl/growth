import Link from "next/link";

import { requireAuthenticatedSession } from "@/lib/auth";
import {
  formatCurrency,
  formatDateTime,
  formatPercent,
  gameTypeLabel,
  goalLabel,
  leadStatusLabel,
} from "@/lib/format";
import { getMerchantDashboard, getMerchantLeads } from "@/lib/store";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireAuthenticatedSession();
  const params = await searchParams;
  const query = params.q?.trim().toLowerCase() ?? "";
  const [dashboard, merchantLeads] = await Promise.all([
    getMerchantDashboard(session.merchant.id, session.merchant),
    getMerchantLeads(session.merchant.id),
  ]);
  const filteredCampaigns = query
    ? dashboard.campaigns.filter((item) =>
        `${item.campaign.title} ${item.campaign.subtitle}`.toLowerCase().includes(query),
      )
    : dashboard.campaigns;
  const merchantCampaignIds = new Set(filteredCampaigns.map((item) => item.campaign.id));
  const recentLeads = merchantLeads
    .filter((lead) => merchantCampaignIds.has(lead.campaignId))
    .filter((lead) =>
      query ? `${lead.firstName} ${lead.email} ${lead.campaignTitle}`.toLowerCase().includes(query) : true,
    )
    .slice(0, 5);
  const activeCampaigns = filteredCampaigns.filter((item) => item.campaign.isActive);
  const bestCampaign = [...filteredCampaigns].sort(
    (left, right) => right.kpis.conversionRate - left.kpis.conversionRate,
  )[0];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[34px] border border-[#dbe4f0] bg-white shadow-[0_20px_50px_rgba(122,136,166,0.14)]">
        <div className="grid gap-6 px-6 py-7 xl:grid-cols-[1.2fr_0.8fr] xl:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
              Vue d&apos;ensemble
            </p>
            <h1 className="mt-3 font-display text-5xl font-semibold leading-none text-[#0f1728]">
              Pilotez vos activations magasin
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5c6577]">
              Suivez vos campagnes en direct, comparez les mécaniques qui performent et lancez
              rapidement une nouvelle activation.
            </p>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <Link
              href="/campaigns/new"
              className="inline-flex rounded-[22px] bg-[#2f6df6] px-5 py-4 text-sm font-semibold !text-white shadow-[0_16px_32px_rgba(47,109,246,0.22)]"
            >
              Créer une campagne
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Campagnes actives", String(activeCampaigns.length)],
          ["Leads totaux", String(filteredCampaigns.reduce((total, item) => total + item.kpis.leads, 0))],
          ["Lots retirés", String(filteredCampaigns.reduce((total, item) => total + item.kpis.redeemed, 0))],
          [
            "Conversion moyenne",
            formatPercent(
              filteredCampaigns.length
                ? Math.round(
                    filteredCampaigns.reduce((total, item) => total + item.kpis.conversionRate, 0) /
                      filteredCampaigns.length,
                  )
                : 0,
            ),
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-[28px] border border-[#dbe4f0] bg-white p-5 shadow-[0_14px_36px_rgba(122,136,166,0.08)]"
          >
            <p className="text-xs uppercase tracking-[0.24em] text-[#7b8496]">{label}</p>
            <p className="mt-4 text-3xl font-semibold text-[#111827]">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="min-h-[350px] rounded-[32px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
                Campagnes prioritaires
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
                À surveiller aujourd&apos;hui
              </h2>
            </div>
            <Link href="/campaigns" className="text-sm font-semibold text-[#2f6df6]">
              Voir toutes les campagnes
            </Link>
          </div>

          <div className="mt-6 overflow-hidden rounded-[28px] border border-[#e4eaf2]">
            <div className="grid grid-cols-[1.5fr_0.85fr_0.7fr_0.7fr_0.9fr] bg-[#f7f9fc] px-5 py-4 text-[11px] uppercase tracking-[0.24em] text-[#7c8597]">
              <span>Campagne</span>
              <span>Mécanique</span>
              <span>Leads</span>
              <span>Actions</span>
              <span>Conversion</span>
            </div>

            {filteredCampaigns.map((item) => (
              <div
                key={item.campaign.id}
                className="grid grid-cols-[1.5fr_0.85fr_0.7fr_0.7fr_0.9fr] items-center gap-3 border-t border-[#edf1f6] px-5 py-5 text-sm"
              >
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
                      <p className="truncate text-[#7a8496]">{goalLabel(item.campaign.goalType)}</p>
                    </div>
                  </div>
                </div>
                <span className="text-[#556173]">{gameTypeLabel(item.campaign.gameType)}</span>
                <span className="font-semibold text-[#111827]">{item.kpis.leads}</span>
                <span className="font-semibold text-[#111827]">{item.kpis.actions}</span>
                <span className="font-semibold text-[#111827]">
                  {formatPercent(item.kpis.conversionRate)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {bestCampaign ? (
            <div className="rounded-[32px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
              <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
                Meilleure campagne
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
                {bestCampaign.campaign.title}
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] bg-[#f7f9fc] p-4">
                  <p className="text-sm text-[#7b8496]">Conversion scan → lead</p>
                  <p className="mt-2 text-3xl font-semibold text-[#111827]">
                    {formatPercent(bestCampaign.kpis.conversionRate)}
                  </p>
                </div>
                <div className="rounded-[24px] bg-[#f7f9fc] p-4">
                  <p className="text-sm text-[#7b8496]">Coût par lead</p>
                  <p className="mt-2 text-3xl font-semibold text-[#111827]">
                    {formatCurrency(bestCampaign.kpis.costPerLead)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="min-h-[350px] rounded-[32px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
                  Dernières saisies
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
                  Leads récents
                </h2>
              </div>
              <Link href="/data" className="text-sm font-semibold text-[#2f6df6]">
                Ouvrir les données
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-[24px] border border-[#e4eaf2] bg-[#f8fafc] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#111827]">{lead.firstName}</p>
                      <p className="text-sm text-[#7b8496]">{lead.email}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#505b6e]">
                      {leadStatusLabel(lead.status)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[#7b8496]">
                    <span>{lead.campaignTitle}</span>
                    <span>{formatDateTime(lead.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
