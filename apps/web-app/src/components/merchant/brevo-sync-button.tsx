"use client";

import { useState } from "react";

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
    <div className="rounded-[8px] border border-border bg-white p-5 shadow-[var(--shadow-product-card)]">
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
          className="inline-flex min-h-11 items-center justify-center rounded-[12px] bg-primary-action-accent px-5 text-sm font-semibold !text-white shadow-[0_14px_30px_rgba(47,109,246,0.18)] disabled:opacity-60"
        >
          {isSyncing ? "Synchronisation..." : "Synchroniser Brevo"}
        </button>
      </div>

      {summary ? (
        <p className="mt-4 rounded-[8px] bg-[#ecfdf3] px-4 py-3 text-sm text-[#047857]">
          {summary.synced} utilisateur(s) synchronisé(s), {summary.skipped} ignoré(s),{" "}
          {summary.failed} en échec.
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-[8px] bg-[#fff1f2] px-4 py-3 text-sm text-[#be123c]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
