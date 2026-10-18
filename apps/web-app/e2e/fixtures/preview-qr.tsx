"use client";

import { useState } from "react";
import { CampaignPreviewQrDialog } from "@/components/merchant/campaign-preview-qr";

/** Synthetic context only; no authenticated session or database bypass. */
export function PreviewQrProof() {
  const [open, setOpen] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [other, setOther] = useState(false);
  const id = other ? "qr-test-other" : "qr-test";
  return <main className="p-4">
    <button onClick={() => setOpen(true)}>Ouvrir le QR de test</button>
    <label><input type="checkbox" checked={admin} onChange={(event) => setAdmin(event.target.checked)} /> Administration</label>
    <label><input type="checkbox" checked={other} onChange={(event) => setOther(event.target.checked)} /> Autre jeu</label>
    <CampaignPreviewQrDialog open={open} campaignId={id} onClose={() => setOpen(false)}
      qrEndpoint={admin ? `/api/admin/campaigns/${id}/preview?format=qr` : undefined} />
  </main>;
}
