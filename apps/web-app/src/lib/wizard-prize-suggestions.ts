import { prizeFieldsFromSuggestion } from "@/lib/prize-suggestion-fields";
import type { PrizeSuggestion } from "@/lib/types";

// The editing scope prevents collisions when the same suggestion is used in different games.
export function suggestedWizardPrizeId(suggestion: PrizeSuggestion, scope: string) {
  return `${scope}-suggestion-${suggestion.id}`;
}

export function isSuggestionInPrizes(
  suggestion: PrizeSuggestion,
  prizes: ReadonlyArray<{ id?: string; label: string; usageConditions?: string }>,
) {
  const fields = prizeFieldsFromSuggestion(suggestion);
  const normalize = (text: string | undefined) => (text ?? "").trim().toLocaleLowerCase("fr");
  return prizes.some((prize) => (prize.id?.startsWith("wizard-prize-") && prize.id.endsWith(`-suggestion-${suggestion.id}`))
    || (normalize(prize.label) === normalize(fields.label)
      && normalize(prize.usageConditions) === normalize(fields.usageConditions)));
}
