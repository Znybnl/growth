"use client";

import { useEffect, useState } from "react";
import type { Merchant, PrizeSuggestion } from "@/lib/types";
import { parsePrizeSuggestionCatalog } from "@/lib/prize-suggestion-catalog";

export function usePrizeSuggestionCatalog(merchant: Pick<Merchant, "id" | "industry" | "industrySubsector">) {
  const industry = merchant.industry?.trim() ?? "";
  const subsector = merchant.industrySubsector?.trim() ?? "";
  const [revision, setRevision] = useState(0);
  const scope = JSON.stringify([merchant.id, industry, subsector, revision]);
  const [result, setResult] = useState<{ scope: string; suggestions: PrizeSuggestion[]; error: string | null }>();

  useEffect(() => {
    if (!industry) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ industry, subsector });
    fetch(`/api/prize-suggestions?${query}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Suggestions indisponibles");
        return parsePrizeSuggestionCatalog(await response.json());
      })
      .then((suggestions) => {
        if (!controller.signal.aborted) setResult({ scope, suggestions, error: null });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ scope, suggestions: [], error: "Impossible de charger les suggestions. Réessayez dans un instant." });
      });
    return () => controller.abort();
  }, [industry, subsector, scope]);

  // Never show the previous establishment's catalog while its replacement loads.
  const current = industry && result?.scope === scope ? result : null;
  return {
    suggestions: current?.suggestions ?? [],
    isLoading: Boolean(industry && !current),
    error: current?.error ?? null,
    retry: () => setRevision((value) => value + 1),
  };
}

export function usePrizeSuggestions(merchant: Pick<Merchant, "id" | "industry" | "industrySubsector">) {
  return usePrizeSuggestionCatalog(merchant).suggestions;
}
