"use client";

import { useRef, useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { DialogShell } from "@/components/ui/dialog";
import { GOOGLE_CLICK_WARNING_TEXT, GOOGLE_CLICK_WARNING_VERSION } from "@/lib/google-click-policy";

export function GoogleClickSetting({ merchantId, adminAccountMerchantId, required, hasGoogle, onChange }: {
  merchantId: string; adminAccountMerchantId?: string; required?: boolean; hasGoogle: boolean;
  onChange: (required: boolean, acceptanceId?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  async function accept() {
    if (pending.current) return;
    pending.current = true; setSaving(true); setError(null);
    try {
      const response = await fetch("/api/merchant/google-click-acceptance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: merchantId, adminAccountMerchantId, accepted: true, version: GOOGLE_CLICK_WARNING_VERSION }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || typeof payload?.acceptanceId !== "string") throw new Error(payload?.error || "L’acceptation n’a pas pu être enregistrée.");
      onChange(true, payload.acceptanceId); setOpen(false);
    } catch (error) { setError(error instanceof Error ? error.message : "Enregistrement impossible."); }
    finally { pending.current = false; setSaving(false); }
  }
  return <>
    <label className="mt-5 flex items-start gap-3 rounded-[14px] border border-fog bg-white p-4 text-sm text-carbon">
      <input type="checkbox" checked={Boolean(required)} disabled={!hasGoogle && !required}
        onChange={event => { if (event.target.checked) { setError(null); setOpen(true); } else onChange(false); }}
        className="mt-1 size-4 shrink-0 accent-aubergine" />
      <span><span className="block font-semibold">Exiger le clic sur « Écrire un avis » avant de jouer</span>
        <span className="mt-1 block text-xs leading-5 text-ash">{hasGoogle
          ? "Uniquement lorsque l’action proposée est Google. Le participant reste libre de publier ou non un avis."
          : "Ajoutez une action Google pour activer cette option."}</span></span>
    </label>
    <DialogShell open={open} onClose={() => { if (!pending.current) setOpen(false); }} labelledBy="google-click-warning-title" describedBy="google-click-warning-text" className="max-w-lg p-6">
      <TriangleAlert className="size-8 text-[#a66a16]" aria-hidden="true" />
      <h2 id="google-click-warning-title" className="mt-4 text-xl font-semibold text-carbon">Activer le clic Google requis ?</h2>
      <p id="google-click-warning-text" className="mt-3 text-sm leading-6 text-ash">{GOOGLE_CLICK_WARNING_TEXT}</p>
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" disabled={saving} onClick={() => setOpen(false)} className="okado-secondary-action px-4 text-sm">Annuler</button>
        <button type="button" disabled={saving} onClick={() => void accept()} className="okado-primary-action px-4 text-sm">{saving && <Loader2 className="mr-2 size-4 animate-spin" />}Je comprends et j’accepte</button>
      </div>
    </DialogShell>
  </>;
}
