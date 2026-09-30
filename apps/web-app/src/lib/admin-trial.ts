const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const MAX_TRIAL_EXTENSION_DAYS = 365;

export type AdminSubscriptionDisplay = {
  label: string;
  tone: "active" | "info" | "warning" | "muted";
};

export function canExtendMerchantTrial(
  status: string | null,
  trialEndDate: string | null,
  subscriptionCancelAtPeriodEnd = false,
  stripeSubscriptionId: string | null = null,
  now = Date.now(),
) {
  const trialEnd = trialEndDate ? Date.parse(trialEndDate) : Number.NaN;
  if (!Number.isFinite(trialEnd) || subscriptionCancelAtPeriodEnd) return false;
  if (status === null && !stripeSubscriptionId) return true;
  return status === "trialing" && Boolean(stripeSubscriptionId) && trialEnd > now;
}

export function getAdminSubscriptionDisplay(
  status: string | null,
  trialEndDate: string | null,
  subscriptionCancelAtPeriodEnd = false,
  subscriptionCurrentPeriodEnd: string | null = null,
  now = Date.now(),
): AdminSubscriptionDisplay {
  if (status === "active") {
    if (!subscriptionCancelAtPeriodEnd) return { label: "Actif", tone: "active" };

    const endDate = subscriptionCurrentPeriodEnd ? new Date(subscriptionCurrentPeriodEnd) : null;
    const formattedDate = endDate && Number.isFinite(endDate.getTime())
      ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(endDate)
      : null;
    return {
      label: formattedDate ? `Actif jusqu’au ${formattedDate}` : "Résiliation programmée",
      tone: "warning",
    };
  }

  const trialEnd = trialEndDate ? Date.parse(trialEndDate) : Number.NaN;
  const remaining = trialEnd - now;
  const activeTrial = Number.isFinite(trialEnd) && remaining > 0;

  // The billing access rules use the trial end date as the source of truth.
  // Keep Pilotage consistent even when Stripe reports a stale/non-active status.
  if (activeTrial) {
    const days = Math.ceil(remaining / DAY_IN_MS);
    const trialLabel = remaining < DAY_IN_MS
      ? "Essai (moins d’un jour restant)"
      : `Essai (${days} jour${days > 1 ? "s" : ""} restant${days > 1 ? "s" : ""})`;
    const suffixes: string[] = [];

    if (status === "past_due" || status === "unpaid") suffixes.push("paiement à suivre");
    if (status === "canceled") suffixes.push("abonnement résilié");
    if (status === "incomplete") suffixes.push("inscription à terminer");
    if (status === "paused") suffixes.push("abonnement suspendu");
    if (subscriptionCancelAtPeriodEnd) {
      const endDate = subscriptionCurrentPeriodEnd
        ? new Date(subscriptionCurrentPeriodEnd)
        : new Date(trialEnd);
      const formattedDate = Number.isFinite(endDate.getTime())
        ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(endDate)
        : null;
      suffixes.push(formattedDate ? `résiliation le ${formattedDate}` : "résiliation programmée");
    }

    const warning = suffixes.length > 0;
    return {
      label: [trialLabel, ...suffixes].join(" · "),
      tone: warning ? "warning" : "info",
    };
  }

  if (status === "trialing" && !Number.isFinite(trialEnd)) {
    return { label: "Essai", tone: "info" };
  }

  if (status === "canceled") return { label: "Résilié", tone: "muted" };
  if (status === "past_due" || status === "unpaid") {
    return { label: "Paiement à suivre", tone: "warning" };
  }
  if (status === "incomplete") return { label: "Inscription à terminer", tone: "warning" };
  if (status === "incomplete_expired") return { label: "Inactif", tone: "muted" };
  if (status === "paused") return { label: "Suspendu", tone: "muted" };

  return { label: "Inactif", tone: "muted" };
}

export function getTrialExtensionDate(
  currentTrialEndDate: string,
  daysToAdd: number,
  now = Date.now(),
) {
  const currentEnd = Date.parse(currentTrialEndDate);
  if (!Number.isFinite(currentEnd)) throw new Error("La date de fin d’essai est invalide.");
  if (!Number.isInteger(daysToAdd) || daysToAdd < 1 || daysToAdd > MAX_TRIAL_EXTENSION_DAYS) {
    throw new Error(`Saisissez un nombre entier de 1 à ${MAX_TRIAL_EXTENSION_DAYS} jours.`);
  }

  return new Date(Math.max(currentEnd, now) + daysToAdd * DAY_IN_MS).toISOString();
}
