"use client";

import type { PrizeSuggestion } from "@/lib/types";
import { beautySuggestionFilterOptions, filterPrizeSuggestionsBySubsector } from "@/lib/prize-suggestion-filters";

export function PrizeSuggestionSubsectorFilter({ suggestions, value, onChange }: {
  suggestions: readonly PrizeSuggestion[]; value: string; onChange: (value: string) => void;
}) {
  const options = beautySuggestionFilterOptions(suggestions, value);
  const count = filterPrizeSuggestionsBySubsector(suggestions, value).length;
  return <div className="mb-4 flex shrink-0 flex-col items-stretch gap-x-4 gap-y-2 rounded-xl border border-[#e8e2ea] bg-white p-3 sm:flex-row sm:items-end">
    <label className="block w-full min-w-0 flex-1 text-sm font-semibold text-[#242126]">
      Sous-secteur des suggestions
      <select value={value} onChange={event => onChange(event.target.value)}
        className="mt-2 block min-h-11 w-full min-w-0 rounded-lg border border-[#e8e2ea] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#64206f] focus:ring-2 focus:ring-[#64206f]/20">
        {options.map(option => <option key={option.value} value={option.value}>{option.label} ({option.count})</option>)}
      </select>
    </label>
    <p role="status" aria-live="polite" className="text-[13px] text-[#716b78] sm:pb-2">{count} suggestion{count > 1 ? "s" : ""} affichée{count > 1 ? "s" : ""}</p>
  </div>;
}
