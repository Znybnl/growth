"use client";

import { useMemo, useState } from "react";

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
    <section className="okado-card overflow-hidden text-[#0f1728]">
      <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:p-8">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Parrainage</p>
          <h2 className="mt-3 font-display text-4xl font-semibold leading-none text-[#0f1728]">
            Partagez Okado, gagnez {commissionRatePercent}%
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#5c6577]">
            Recevez {commissionRatePercent}% des abonnements payés par vos filleuls pendant{" "}
            {summary.account.commissionDurationMonths} mois. Les commissions sont calculées
            automatiquement puis payées manuellement par Okado.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              ["Commissions en attente", formatMoney(summary.totals.pendingCommissionCents)],
              ["Commissions payées", formatMoney(summary.totals.paidCommissionCents)],
              ["Filleuls actifs", String(summary.totals.activeReferrals)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[8px] border border-[#e3eaf5] bg-[#f7f9fc] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#7b8496]">{label}</p>
                <p className="mt-3 text-2xl font-semibold text-[#0f1728]">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[8px] border border-[#e3eaf5] bg-[#fbfcff] p-5 text-[#111827] shadow-[0_16px_34px_rgba(122,136,166,0.12)]">
          <p className="text-xs uppercase tracking-[0.24em] text-[#7b8496]">Votre code</p>
          <p className="mt-3 rounded-[8px] border border-[#dbe4f0] bg-[#f7f9fc] px-4 py-4 text-center text-2xl font-semibold tracking-[0.16em]">
            {summary.account.code}
          </p>

          <p className="mt-5 text-xs uppercase tracking-[0.24em] text-[#7b8496]">Lien affilié</p>
          <div className="mt-3 rounded-[8px] border border-[#dbe4f0] bg-[#f7f9fc] px-4 py-3 text-sm leading-6 text-[#475063]">
            {referralUrl}
          </div>

          <button
            type="button"
            onClick={() => void copyReferralLink()}
            className="mt-4 inline-flex w-full items-center justify-center rounded-[12px] bg-[#2f6df6] px-4 py-4 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(47,109,246,0.24)]"
          >
            {copied ? "Lien copié" : "Copier le lien"}
          </button>
        </div>
      </div>

      <div className="border-t border-[#eef1f7] bg-[#fbfcff] px-6 py-5 xl:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#7b8496]">Filleuls</p>
            <h3 className="mt-2 text-2xl font-semibold">Suivi des inscriptions attribuées</h3>
          </div>
          <p className="text-sm text-[#5c6577]">{summary.totals.referrals} filleul(s)</p>
        </div>

        <div className="mt-5 overflow-hidden rounded-[8px] border border-[#e3eaf5] bg-white text-[#111827]">
          {summary.referrals.length ? (
            summary.referrals.slice(0, 6).map((referral) => (
              <div
                key={referral.id}
                className="grid gap-3 border-b border-[#eef1f7] px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_120px_130px]"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{referral.referredMerchantName}</p>
                  <p className="mt-1 text-sm text-[#7b8496]">
                    Depuis le {new Date(referral.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <p className="text-sm font-semibold text-[#2450c8]">
                  {referralStatusLabel(referral.status)}
                </p>
                <p className="text-sm font-semibold">
                  {formatMoney(referral.pendingCommissionCents)}
                </p>
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-center text-sm text-[#7b8496]">
              Aucun filleul pour le moment. Partagez votre lien pour démarrer.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
