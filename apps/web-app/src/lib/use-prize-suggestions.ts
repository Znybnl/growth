"use client";

import { useEffect, useState } from "react";
import type { Merchant, PrizeSuggestion } from "@/lib/types";

export function usePrizeSuggestions(merchant: Pick<Merchant, "id" | "industry" | "industrySubsector">) {
  const industry = merchant.industry?.trim() ?? "";
  const subsector = merchant.industrySubsector?.trim() ?? "";
  const scope = JSON.stringify([merchant.id, industry, subsector]);
  const [result, setResult] = useState<{ scope: string; suggestions: PrizeSuggestion[] }>();

  useEffect(() => {
    if (!industry) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ industry, subsector });
    fetch(`/api/prize-suggestions?${query}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Suggestions indisponibles");
        return (await response.json()) as { suggestions?: PrizeSuggestion[] };
      })
      .then((payload) => {
        if (!controller.signal.aborted) setResult({ scope, suggestions: payload.suggestions ?? [] });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ scope, suggestions: [] });
      });
    return () => controller.abort();
  }, [industry, subsector, scope]);

  // Never show the previous establishment's catalog while its replacement loads.
  return industry && result?.scope === scope ? result.suggestions : [];
}
