"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle } from "lucide-react";

export function HandleEmailIncidentButton({ deliveryId, eventAt, status }: {
  deliveryId: string; eventAt: string | null; status: string;
}) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [handled, setHandled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleIncident() {
    if (inFlight.current || handled) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/support/email-incidents/${encodeURIComponent(deliveryId)}/handle`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventAt, status }),
      });
      const payload = await response.json() as { handled?: boolean; error?: string };
      if (!response.ok || payload.handled !== true) {
        throw new Error(payload.error ?? "Impossible de traiter cet incident.");
      }
      setHandled(true);
      window.dispatchEvent(new CustomEvent("merchant-alerts-refresh"));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de traiter cet incident.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return <div className="mt-4">
    <button type="button" onClick={() => void handleIncident()} disabled={pending || handled}
      aria-busy={pending} className="okado-secondary-action max-w-full gap-2 px-3 text-sm disabled:opacity-60">
      {pending ? <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden="true" /> : <Check className="size-4 shrink-0" aria-hidden="true" />}
      {pending ? "Traitement…" : handled ? "Incident traité" : "Marquer comme traité"}
    </button>
    {handled ? <p role="status" className="mt-2 text-sm text-ash">Incident traité, sans renvoi de l’e-mail.</p> : null}
    {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
  </div>;
}
