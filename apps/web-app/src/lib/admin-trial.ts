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
  if (status === "active" || status === "trialing") {
    if (subscriptionCancelAtPeriodEnd) {
      const endDate = subscriptionCurrentPeriodEnd
        ? new Date(subscriptionCurrentPeriodEnd)
        : status === "trialing" && trialEndDate
          ? new Date(trialEndDate)
          : null;
      const formattedDate = endDate && Number.isFinite(endDate.getTime())
        ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(endDate)
        : null;
      return {
        label: status === "trialing"
          ? formattedDate ? `Essai · résiliation le ${formattedDate}` : "Essai · résiliation programmée"
          : formattedDate ? `Actif jusqu’au ${formattedDate}` : "Résiliation programmée",
        tone: "warning",
      };
    }
    if (status === "active") return { label: "Actif", tone: "active" };
  }

  if (status === "past_due" || status === "unpaid") {
    return { label: "Paiement à suivre", tone: "warning" };
  }

  const trialEnd = trialEndDate ? Date.parse(trialEndDate) : Number.NaN;
  const remaining = trialEnd - now;
  const activeTrial = Number.isFinite(trialEnd) && remaining > 0;

  if (status === "trialing") {
    if (!Number.isFinite(trialEnd)) return { label: "Essai", tone: "info" };
    if (!activeTrial) return { label: "Inactif", tone: "muted" };
  }

  if ((status === null || status === "trialing") && activeTrial) {
    if (remaining < DAY_IN_MS) {
      return { label: "Essai (moins d’un jour restant)", tone: "info" };
    }

    const days = Math.ceil(remaining / DAY_IN_MS);
    return {
      label: `Essai (${days} jour${days > 1 ? "s" : ""} restant${days > 1 ? "s" : ""})`,
      tone: "info",
    };
  }

  if (status === "canceled") return { label: "Résilié", tone: "muted" };
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
