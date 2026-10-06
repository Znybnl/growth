import { isBeautyIndustry } from "@/lib/merchant-options";
import type { PrizeSuggestion } from "@/lib/types";

export function suggestionRequiresPurchase(condition: string) {
  const text = condition.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/sans (?:obligation d['’]achat|achat|prestation payante)/.test(text)) return false;
  return /(?:avec|ajoutees? a)[^.]*\bpayant(?:e|es|s)?\b/.test(text)
    || /avec une nouvelle pose/.test(text);
}

// Applied only when adding a new Beauty suggestion, never to saved campaign lots.
export function prizeFieldsFromSuggestion(suggestion: PrizeSuggestion) {
  const usageConditions = isBeautyIndustry(suggestion.industry) ? suggestion.description : "";
  return {
    label: suggestion.label,
    totalQuantity: null,
    probability: suggestion.probability,
    estimatedUnitCost: suggestion.estimatedUnitCost,
    usageConditions,
    purchaseRequired: suggestionRequiresPurchase(usageConditions),
  };
}
