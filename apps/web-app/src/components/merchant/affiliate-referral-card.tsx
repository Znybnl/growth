"use client";

import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import { AffiliateSummary } from "@/lib/types";

type AffiliateReferralCardProps = {
  summary: AffiliateSummary;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function referralStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Abonné";
    case "trialing":
      return "En essai";
    case "canceled":
      return "Annulé";
    default:
      return "Inscrit";
  }
}

export function AffiliateReferralCard({ summary }: AffiliateReferralCardProps) {
  const [copied, setCopied] = useState(false);
  const commissionRatePercent = summary.account.commissionRateBps / 100;
  const referralUrl = useMemo(
    () => `https://app.okado.app${summary.referralLinkPath}`,
    [summary.referralLinkPath],
  );

  async function copyReferralLink() {
    const origin = typeof window === "undefined" ? "https://app.okado.app" : window.location.origin;
    await navigator.clipboard.writeText(`${origin}${summary.referralLinkPath}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="okado-card overflow-hidden text-graphite">
      <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:p-8">
        <div>
          <p className="okado-label">Parrainage</p>
          <h2 className="mt-3 okado-section-title">
            Partagez Okado, gagnez {commissionRatePercent}%
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-ash">
            Recevez {commissionRatePercent}% des abonnements payés par vos filleuls pendant{" "}
            {summary.account.commissionDurationMonths} mois. Les commissions sont calculées
            automatiquement puis payées manuellement par Okado.
          </p>

          <div className="mt-6 grid gap-4 border-y border-fog py-4 md:grid-cols-3 md:divide-x md:divide-fog">
            {[
              ["Commissions en attente", formatMoney(summary.totals.pendingCommissionCents)],
              ["Commissions payées", formatMoney(summary.totals.paidCommissionCents)],
              ["Filleuls actifs", String(summary.totals.activeReferrals)],
            ].map(([label, value]) => (
              <div key={label} className="md:px-4 md:first:pl-0">
                <p className="okado-label tracking-[0.18em]">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-carbon">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-fog pt-6 text-graphite xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
          <p className="okado-label">Votre code</p>
          <p className="mt-3 rounded-[8px] bg-purple-haze px-4 py-4 text-center text-2xl font-semibold tracking-[0.16em]">
            {summary.account.code}
          </p>

          <p className="okado-label mt-5">Lien affilié</p>
          <div className="mt-3 rounded-[8px] bg-purple-haze px-4 py-3 text-sm leading-6 text-charcoal">
            {referralUrl}
          </div>

          <button
            type="button"
            onClick={() => void copyReferralLink()}
            className="okado-filled-action mt-4 w-full px-4"
          >
            {copied ? "Lien copié" : "Copier le lien"}
          </button>
        </div>
      </div>

      <div className="border-t border-fog bg-purple-haze px-6 py-5 xl:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="okado-label">Filleuls</p>
            <h3 className="okado-section-title mt-2">Suivi des inscriptions attribuées</h3>
          </div>
          <p className="text-sm text-ash">{summary.totals.referrals} filleul(s)</p>
        </div>

        <div className="mt-5 overflow-hidden bg-white text-graphite">
          {summary.referrals.length ? (
            summary.referrals.slice(0, 6).map((referral) => (
              <div
                key={referral.id}
                className="okado-list-row grid gap-3 px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_120px_130px]"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{referral.referredMerchantName}</p>
                  <p className="mt-1 text-sm text-ash">
                    Depuis le {new Date(referral.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <StatusBadge tone={referral.status === "canceled" ? "muted" : referral.status === "trialing" ? "warning" : "active"}>
                  {referralStatusLabel(referral.status)}
                </StatusBadge>
                <p className="text-sm font-semibold">
                  {formatMoney(referral.pendingCommissionCents)}
                </p>
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-center text-sm text-ash">
              Aucun filleul pour le moment. Partagez votre lien pour démarrer.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
