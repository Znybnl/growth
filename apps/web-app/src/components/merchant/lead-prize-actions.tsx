"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { LeadStatus } from "@/lib/types";

export function LeadPrizeActions({ leadId, status, hasPrize, isExpired = false }: {
  leadId: string; status: LeadStatus; hasPrize: boolean; isExpired?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!hasPrize) return <span className="text-sm text-[#7b8496]">Aucun lot</span>;
  async function submit(action: "redeem" | "reset") {
    setPending(true); setError(null);
    try {
      const response = await fetch(`/api/merchant/leads/${leadId}/${action}`, { method: "POST" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Action impossible");
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Action impossible"); }
    finally { setPending(false); }
  }
  const classes = "inline-flex h-10 w-[150px] items-center justify-center rounded-[4px] px-3 text-xs font-semibold leading-tight transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-45";
  return <div className="min-w-[250px] space-y-2"><div className="flex flex-wrap gap-2">
    <button type="button" onClick={() => submit("redeem")} disabled={pending || status === "redeemed" || isExpired} title={isExpired ? "Lot expiré" : undefined} className={`${classes} bg-aubergine text-white`}>Marquer récupéré</button>
    <button type="button" onClick={() => submit("reset")} disabled={pending || status === "claimed"} className={`${classes} border border-[#d7e0ed] bg-white text-[#182033]`}>Réinitialiser</button>
  </div>{error ? <p className="text-xs font-semibold text-[#c2410c]">{error}</p> : null}</div>;
}
