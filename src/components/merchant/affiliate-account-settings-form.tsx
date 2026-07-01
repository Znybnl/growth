"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AffiliateAccountStatus } from "@/lib/types";

type AffiliateAccountSettingsFormProps = {
  accountId: string;
  status: AffiliateAccountStatus;
  commissionRateBps: number;
  commissionDurationMonths: number;
};

export function AffiliateAccountSettingsForm({
  accountId,
  status,
  commissionRateBps,
  commissionDurationMonths,
}: AffiliateAccountSettingsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch(`/api/affiliates/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          status: formData.get("status"),
          commissionRatePercent: Number(formData.get("commissionRatePercent")),
          commissionDurationMonths: Number(formData.get("commissionDurationMonths")),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Mise à jour impossible.");
      }

      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Mise à jour impossible.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-2" onSubmit={submit}>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs">
          <span className="mb-1 block text-[#7b8496]">Statut</span>
          <select
            name="status"
            defaultValue={status}
            className="rounded-[14px] border border-[#d7e0ed] bg-white px-3 py-2 outline-none"
          >
            <option value="disabled">Désactivé</option>
            <option value="active">Activé</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-[#7b8496]">Taux %</span>
          <input
            name="commissionRatePercent"
            type="number"
            min="0"
            max="100"
            step="1"
            defaultValue={commissionRateBps / 100}
            className="w-20 rounded-[14px] border border-[#d7e0ed] bg-white px-3 py-2 outline-none"
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-[#7b8496]">Durée</span>
          <input
            name="commissionDurationMonths"
            type="number"
            min="1"
            max="120"
            step="1"
            defaultValue={commissionDurationMonths}
            className="w-20 rounded-[14px] border border-[#d7e0ed] bg-white px-3 py-2 outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-[14px] bg-[#111827] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {isLoading ? "..." : "Enregistrer"}
        </button>
      </div>
      {error ? <p className="text-xs font-semibold text-[#a8321a]">{error}</p> : null}
    </form>
  );
}
