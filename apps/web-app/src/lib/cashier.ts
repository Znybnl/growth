import { CashierRedemptionStatus } from "@/lib/types";

export function normalizeCashierCode(value: string) {
  return value.replace(/\s+/g, "").trim().toUpperCase();
}

export function isCashierCodeCandidate(value: string) {
  const normalized = normalizeCashierCode(value);
  return normalized.length >= 4 && normalized.length <= 40 && /^[A-Z0-9-]+$/.test(normalized);
}

export function cashierStatusMessage(status: CashierRedemptionStatus) {
  switch (status) {
    case "redeemed":
      return "Ce gain a déjà été retiré.";
    case "expired":
      return "Ce gain est expiré et ne peut plus être remis.";
    case "not_available":
      return "Ce gain n’est pas encore disponible.";
    case "available":
      return "Gain valide. Vérifiez les informations avant de confirmer.";
    default:
      return "Ce code ne correspond à aucun gain de ce commerce.";
  }
}

