"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";

import { MerchantBillingSummary } from "@/lib/types";

type BillingSubscriptionCardProps = {
  billing: MerchantBillingSummary;
};

function formatDate(value?: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function BillingSubscriptionCard({ billing }: BillingSubscriptionCardProps) {
  const [isLoading, setIsLoading] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const priceLabel = useMemo(() => `${formatCurrency(20)} / mois`, []);

  async function redirectTo(endpoint: "/api/stripe/checkout-session" | "/api/stripe/portal-session") {
    setError(null);
    setIsLoading(endpoint.includes("portal") ? "portal" : "checkout");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await response.json()) as { error?: string; url?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Redirection impossible.");
      }

      window.location.href = payload.url;
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Redirection impossible.",
      );
      setIsLoading(null);
    }
  }

  return (
    <section className="okado-card p-5 md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="okado-label">
            Abonnement & facturation
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-graphite">
            Votre abonnement
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ash">
            Gérez votre essai gratuit, activez votre abonnement mensuel et gardez vos jeux
            concours actifs sans interruption.
          </p>
        </div>

        <div className="okado-status-badge okado-status-muted">
          {billing.isSubscribed
            ? "Abonnement actif"
            : billing.isTrialActive
              ? "Essai gratuit"
              : "Accès suspendu"}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
        <div className="space-y-4">
          {billing.isSubscribed ? (
            <div className="rounded-[8px] border border-[#cfe9d8] bg-[#effaf3] p-5 text-sm text-[#19633f]">
              <p className="font-semibold">Abonnement actif</p>
              <p className="mt-1 leading-6">
                Votre prochaine facture est prévue le{" "}
                <span className="font-semibold">
                  {formatDate(billing.nextBillingDate) || "bientôt"}
                </span>{" "}
                pour un montant de <span className="font-semibold">{priceLabel}</span>.
              </p>
              {billing.subscriptionCancelAtPeriodEnd ? (
                <p className="mt-1 text-[#7b4f00]">
                  La résiliation est programmée à la fin de la période en cours.
                </p>
              ) : null}
            </div>
          ) : billing.isTrialActive ? (
            <div className="rounded-[8px] border border-[#cfe9d8] bg-[#effaf3] p-5 text-sm text-[#19633f]">
              <p className="font-semibold">Vous êtes actuellement en période d’essai gratuit.</p>
              <p className="mt-1 leading-6">
                Il vous reste{" "}
                <span className="font-semibold">{billing.daysLeftInTrial} jour(s)</span> pour
                profiter pleinement de l’application.
              </p>
              <p className="mt-1 leading-6">
                Prochain prélèvement : <span className="font-semibold">{priceLabel}</span> le{" "}
                <span className="font-semibold">
                  {formatDate(billing.trialEndDate) || "à la fin de l’essai"}
                </span>
                .
              </p>
            </div>
          ) : (
            <div className="rounded-[8px] border border-[#f3c9c1] bg-[#fff1ee] p-5 text-sm text-[#8b2c18]">
              <p className="font-semibold">Votre période d’essai est terminée.</p>
              <p className="mt-2 leading-7">
                Vos jeux concours sont actuellement suspendus en boutique et l’export de vos
                prospects est verrouillé.
              </p>
            </div>
          )}

          <div className="rounded-[16px] border border-lavender-mist bg-purple-haze p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <p className="text-sm font-semibold text-graphite">Plan mensuel</p>
              <p className="text-2xl font-semibold text-aubergine">{priceLabel}</p>
            </div>
            <ul className="mt-3 grid gap-2 text-sm leading-5 text-[#5c6577]">
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1f9d62]" aria-hidden="true" /><span>Jeux publics actifs et sans interruption</span></li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1f9d62]" aria-hidden="true" /><span>Exports CSV et données de campagne disponibles</span></li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1f9d62]" aria-hidden="true" /><span>Suivi complet de vos animations depuis un seul compte</span></li>
            </ul>
          </div>
        </div>

        <div className="rounded-[8px] border border-border bg-white p-5 shadow-[0_18px_36px_rgba(122,136,166,0.08)]">
          <p className="text-sm font-semibold text-[#0f1728]">Actions</p>
          <div className="mt-4 space-y-3">
            {billing.isSubscribed ? (
              <button
                type="button"
                onClick={() => redirectTo("/api/stripe/portal-session")}
                disabled={isLoading !== null}
                className="okado-filled-action w-full px-5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading === "portal"
                  ? "Ouverture du portail..."
                  : "Gérer mon abonnement et mes factures"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => redirectTo("/api/stripe/checkout-session")}
                disabled={isLoading !== null}
                className="okado-filled-action w-full px-5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading === "checkout"
                  ? "Redirection vers le paiement..."
                  : billing.isTrialActive
                    ? "Activer l’abonnement dès maintenant"
                    : "Passer à la version Pro (20€/mois)"}
              </button>
            )}
          </div>

          <dl className="mt-5 space-y-3 text-sm text-[#5c6577]">
            <div className="flex items-center justify-between gap-4">
              <dt>Statut</dt>
              <dd className="font-medium capitalize text-[#0f1728]">
                {billing.subscriptionStatus
                  ? billing.subscriptionStatus.replaceAll("_", " ")
                  : billing.isTrialActive
                    ? "Essai gratuit"
                    : "Aucun abonnement"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Carte enregistrée</dt>
              <dd className="font-medium text-[#0f1728]">
                {billing.hasPaymentMethodOnFile ? "Oui" : "Non"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Prochaine échéance</dt>
              <dd className="font-medium text-[#0f1728]">
                {formatDate(billing.nextBillingDate) || "—"}
              </dd>
            </div>
          </dl>

          {error ? (
            <div className="mt-4 rounded-[8px] border border-[#f3c9c1] bg-[#fff1ee] px-4 py-3 text-sm text-[#8b2c18]">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
