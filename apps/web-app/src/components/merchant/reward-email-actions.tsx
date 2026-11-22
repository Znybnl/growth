"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RotateCw } from "lucide-react";
import type { LeadStatus, RewardEmailDeliveryStatus } from "@/lib/types";

export function RewardEmailActions({ leadId, status, deliveryStatus, permanentBounce }: {
  leadId: string; status: LeadStatus; deliveryStatus?: RewardEmailDeliveryStatus; permanentBounce: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function resend() {
    setPending(true); setMessage(null);
    try {
      const response = await fetch(`/api/merchant/leads/${leadId}/resend-email`, { method: "POST" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Renvoi impossible");
      setMessage("E-mail renvoyé."); setLocked(true);
      window.dispatchEvent(new CustomEvent("merchant-alerts-refresh")); router.refresh();
    } catch (err) { setMessage(err instanceof Error ? err.message : "Renvoi impossible"); }
    finally { setPending(false); }
  }
  return <div className="mt-2">
    <button type="button" onClick={resend} disabled={permanentBounce || status === "redeemed" || pending || deliveryStatus === "queued" || locked}
      className="inline-flex items-center gap-1 rounded border border-[#d7e0ed] px-2 py-1 text-xs font-semibold text-[#433052] hover:bg-[#f5f1f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#433052] disabled:cursor-not-allowed disabled:opacity-60">
      <RotateCw aria-hidden="true" size={13} /> {pending ? "Renvoi…" : locked ? "Patientez 2 min" : "Renvoyer e-mail"}
    </button>
    {permanentBounce ? <p className="mt-1 text-xs text-[#713f00]">Renvoi indisponible : rejet permanent de l’adresse e-mail (hard bounce).</p> : null}
    {message ? <p className="mt-1 break-words text-xs" role="status">{message}</p> : null}
  </div>;
}
