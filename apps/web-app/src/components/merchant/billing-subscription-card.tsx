"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";

import { StatusNotice } from "@/components/ui/workspace";
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
    <section className="okado-section-surface p-0 pb-2">
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

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
        <div className="space-y-4">
          {billing.isSubscribed ? (
            <StatusNotice tone="success" className="p-5">
              <p className="font-semibold">Abonnement actif</p>
              <p className="mt-1 leading-6">
                Votre prochaine facture est prévue le{" "}
                <span className="font-semibold">
                  {formatDate(billing.nextBillingDate) || "bientôt"}
                </span>{" "}
                pour un montant de <span className="font-semibold">{priceLabel}</span>.
              </p>
              {billing.subscriptionCancelAtPeriodEnd ? (
                <p className="mt-1 text-[var(--okado-status-warning-text)]">
                  La résiliation est programmée à la fin de la période en cours.
                </p>
              ) : null}
            </StatusNotice>
          ) : billing.isTrialActive ? (
            <StatusNotice tone="success" className="p-5">
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
            </StatusNotice>
          ) : (
            <StatusNotice tone="danger" className="p-5">
              <p className="font-semibold">Votre période d’essai est terminée.</p>
              <p className="mt-2 leading-7">
                Vos jeux concours sont actuellement suspendus en boutique et l’export de vos
                prospects est verrouillé.
              </p>
            </StatusNotice>
          )}

          <div className="border-t border-lavender-mist pt-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <p className="text-sm font-semibold text-graphite">Plan mensuel</p>
              <p className="text-2xl font-semibold text-aubergine">{priceLabel}</p>
            </div>
            <ul className="mt-3 grid gap-2 text-sm leading-5 text-charcoal">
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--okado-status-success-text)]" aria-hidden="true" /><span>Jeux publics actifs et sans interruption</span></li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--okado-status-success-text)]" aria-hidden="true" /><span>Exports CSV et données de campagne disponibles</span></li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--okado-status-success-text)]" aria-hidden="true" /><span>Suivi complet de vos animations depuis un seul compte</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-lavender-mist pt-5 lg:border-l lg:border-t-0 lg:pl-8">
          <p className="text-sm font-semibold text-carbon">Actions</p>
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

          <dl className="mt-5 space-y-3 text-sm text-charcoal">
            <div className="flex items-center justify-between gap-4">
              <dt>Statut</dt>
              <dd className="font-medium capitalize text-carbon">
                {billing.subscriptionStatus
                  ? billing.subscriptionStatus.replaceAll("_", " ")
                  : billing.isTrialActive
                    ? "Essai gratuit"
                    : "Aucun abonnement"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Carte enregistrée</dt>
              <dd className="font-medium text-carbon">
                {billing.hasPaymentMethodOnFile ? "Oui" : "Non"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Prochaine échéance</dt>
              <dd className="font-medium text-carbon">
                {formatDate(billing.nextBillingDate) || "—"}
              </dd>
            </div>
          </dl>

          {error ? (
            <StatusNotice tone="danger" className="mt-4">
              {error}
            </StatusNotice>
          ) : null}
        </div>
      </div>
    </section>
  );
}
