"use client";

import { useEffect, useState } from "react";
import type { ReusablePrize } from "@/lib/reusable-prizes";

export function useReusablePrizes(endpoint: string | undefined, enabled: boolean, excludeCampaignId?: string) {
  const [revision, setRevision] = useState(0);
  const scope = JSON.stringify([endpoint, excludeCampaignId, revision]);
  const [result, setResult] = useState<{ scope: string; prizes: ReusablePrize[]; error: string | null }>();
  useEffect(() => {
    if (!enabled || !endpoint || result?.scope === scope) return;
    const controller = new AbortController();
    const query = excludeCampaignId ? `?${new URLSearchParams({ excludeCampaignId })}` : "";
    fetch(endpoint + query, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Lots indisponibles");
        return await response.json() as { prizes: ReusablePrize[] };
      })
      .then(({ prizes }) => {
        if (!controller.signal.aborted) setResult({ scope, prizes: Array.isArray(prizes) ? prizes : [], error: null });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ scope, prizes: [], error: "Impossible de charger vos lots précédents. Réessayez dans un instant." });
      });
    return () => controller.abort();
  }, [enabled, endpoint, excludeCampaignId, scope, result?.scope]);
  const current = result?.scope === scope ? result : null;
  return { prizes: current?.prizes ?? [], isLoading: Boolean(endpoint && !current),
    error: endpoint ? current?.error ?? null : "La bibliothèque de cet établissement est indisponible.",
    retry: () => setRevision((value) => value + 1) };
}
