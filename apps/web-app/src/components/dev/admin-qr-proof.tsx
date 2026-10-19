"use client";

import { useState } from "react";
import { AdminCampaignQrDownload } from "@/components/merchant/admin-campaign-qr-download";
import { CampaignSavedDialog } from "@/components/merchant/campaign-saved-dialog";

/** Synthetic UI, not an authenticated account. The API still enforces permissions. */
export function AdminQrProof() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false);
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-5">
      <h1 className="text-xl font-semibold">Fixture QR de diffusion administrateur</h1>
      <label className="flex gap-2"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Jeu publié</label>
      <div className="okado-card flex flex-wrap items-center gap-3 p-5">
        <AdminCampaignQrDownload campaignId="admin-qr-fixture" isActive={active} />
        <button className="okado-secondary-action px-4 text-sm" onClick={() => setOpen(true)}>Confirmation d’enregistrement</button>
        {!active ? <p className="w-full text-xs text-ash">Le QR de diffusion n’ouvre le jeu qu’après sa publication.</p> : null}
      </div>
      <CampaignSavedDialog
        open={open} campaignId="admin-qr-fixture" adminTargetName="Commerce de test"
        adminIsActive={active} onClose={() => setOpen(false)} onPreview={() => {}} onPreviewQr={() => {}}
      />
    </main>
  );
}
