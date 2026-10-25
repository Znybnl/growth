import { BEAUTY_SUBSECTOR_OPTIONS, GENERAL_BEAUTY_SUBSECTOR, isBeautyIndustry, normalizeBeautySubsector } from "@/lib/merchant-options";
import type { PrizeSuggestion } from "@/lib/types";

export const UNCLASSIFIED_SUGGESTIONS = "__unclassified__";
type Context = { industry?: string; industrySubsector?: string };

export function canFilterBeautySuggestions(context?: Context) {
  return isBeautyIndustry(context?.industry)
    && normalizeBeautySubsector(context?.industrySubsector) === GENERAL_BEAUTY_SUBSECTOR;
}

/** Presentation only: preserve source order, identities, conditions and values. */
export function filterPrizeSuggestionsBySubsector<T extends PrizeSuggestion>(suggestions: readonly T[], subsector: string): readonly T[] {
  if (!subsector) return suggestions;
  const selected = subsector === UNCLASSIFIED_SUGGESTIONS ? "" : normalizeBeautySubsector(subsector);
  return suggestions.filter(item => normalizeBeautySubsector(item.industrySubsector) === selected);
}

export function beautySuggestionFilterOptions(suggestions: readonly PrizeSuggestion[], selectedValue = "") {
  const options = [
    { value: "", label: "Tous les sous-secteurs", count: suggestions.length },
    ...BEAUTY_SUBSECTOR_OPTIONS.map(value => ({
      value, label: value, count: filterPrizeSuggestionsBySubsector(suggestions, value).length,
    })),
  ];
  const unclassified = filterPrizeSuggestionsBySubsector(suggestions, UNCLASSIFIED_SUGGESTIONS).length;
  if (unclassified || selectedValue === UNCLASSIFIED_SUGGESTIONS) options.push({ value: UNCLASSIFIED_SUGGESTIONS, label: "Suggestions sans sous-secteur", count: unclassified });
  return options;
}
