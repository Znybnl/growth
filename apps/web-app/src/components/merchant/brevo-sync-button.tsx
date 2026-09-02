"use client";

import { useState } from "react";

import { StatusNotice } from "@/components/ui/workspace";

type BrevoSyncSummary = {
  attempted: number;
  synced: number;
  skipped: number;
  failed: number;
};

export function BrevoSyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [summary, setSummary] = useState<BrevoSyncSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSync() {
    setIsSyncing(true);
    setError(null);
    setSummary(null);

    try {
      const response = await fetch("/api/integrations/brevo/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await response.json()) as {
        error?: string;
        summary?: BrevoSyncSummary;
      };

      if (!response.ok || !payload.summary) {
        throw new Error(payload.error ?? "Synchronisation Brevo impossible.");
      }

      setSummary(payload.summary);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Synchronisation Brevo impossible.");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="okado-card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="okado-label">Brevo</p>
          <h2 className="mt-2 text-2xl font-semibold text-midnight-ink">
            Synchronisation marketing
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ash">
            Envoie uniquement les utilisateurs de l&apos;application Okado vers la liste Brevo configurée.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runSync()}
          disabled={isSyncing}
          className="okado-filled-action px-5 text-sm disabled:opacity-60"
        >
          {isSyncing ? "Synchronisation..." : "Synchroniser Brevo"}
        </button>
      </div>

      {summary ? (
        <StatusNotice tone="success" className="mt-4">
          {summary.synced} utilisateur(s) synchronisé(s), {summary.skipped} ignoré(s),{" "}
          {summary.failed} en échec.
        </StatusNotice>
      ) : null}
      {error ? (
        <StatusNotice tone="danger" className="mt-4">
          {error}
        </StatusNotice>
      ) : null}
    </div>
  );
}
