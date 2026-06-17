"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { LeadStatus } from "@/lib/types";

type LeadPrizeActionsProps = {
  leadId: string;
  status: LeadStatus;
  hasPrize: boolean;
  compact?: boolean;
};

export function LeadPrizeActions({
  leadId,
  status,
  hasPrize,
  compact = false,
}: LeadPrizeActionsProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasPrize) {
    return <span className="text-sm text-[#7b8496]">Aucun lot</span>;
  }

  async function submit(action: "redeem" | "reset") {
    setIsPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/merchant/leads/${leadId}/${action}`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Action impossible");
      }

      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action impossible");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className={compact ? "space-y-2" : "min-w-[190px] space-y-2"}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => submit("redeem")}
          disabled={isPending || status === "redeemed"}
          className="rounded-[14px] bg-[#111827] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          Marquer récupéré
        </button>
        <button
          type="button"
          onClick={() => submit("reset")}
          disabled={isPending || status === "claimed"}
          className="rounded-[14px] border border-[#d7e0ed] bg-white px-3 py-2 text-xs font-semibold text-[#182033] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Réinitialiser
        </button>
      </div>
      {error ? <p className="text-xs font-semibold text-[#c2410c]">{error}</p> : null}
    </div>
  );
}
