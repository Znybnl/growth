"use client";

import { useState } from "react";
import { AdminCampaignQrDownload } from "@/components/merchant/admin-campaign-qr-download";
import { CampaignSavedDialog } from "@/components/merchant/campaign-saved-dialog";
import { CampaignQrDownload } from "@/components/merchant/campaign-qr-download";
import { FileDownloadButton } from "@/components/merchant/download-feedback";
import { CampaignActionsMenu } from "@/components/merchant/campaign-actions-menu";
import { MerchantShell } from "@/components/merchant/merchant-shell";

const merchant = { id: "download-fixture", companyName: "Commerce de test", industry: "Beauté",
  logoText: "Commerce de test", onboardingCompleted: true, createdAt: "2026-10-18T00:00:00Z" };

/** Synthetic UI, not an authenticated account. The API still enforces permissions. */
export function AdminQrProof() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [admin, setAdmin] = useState(true);
  return (
    <MerchantShell merchant={merchant} user={{ id: "download-user", merchantId: merchant.id,
      role: "owner", firstName: "Camille", lastName: "Test", email: "download@example.test", password: "", createdAt: merchant.createdAt }}
      locations={[{ merchant, role: "owner" }]} activeLocationId={merchant.id} isSaasAdmin={false}>
    <div className="mx-auto max-w-3xl space-y-5 p-5">
      <h1 className="text-xl font-semibold">Fixture QR de diffusion administrateur</h1>
      <label className="flex gap-2"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Jeu publié</label>
      <div className="okado-card flex flex-wrap items-center gap-3 p-5">
        <AdminCampaignQrDownload campaignId="admin-qr-fixture" isActive={active} />
        <CampaignQrDownload campaignId="merchant-qr-fixture" isActive={active} label="QR marchand" />
        <CampaignActionsMenu campaignId="merchant-qr-fixture" campaignTitle="Jeu de test" isActive={active} />
        <FileDownloadButton href="/api/merchant/leads?format=csv&campaign=merchant-qr-fixture" fileName="merchant-leads.csv" title="Export des contacts" className="okado-secondary-action px-4">Export CSV</FileDownloadButton>
        <button className="okado-secondary-action px-4 text-sm" onClick={() => { setAdmin(true); setOpen(true); }}>Confirmation d’enregistrement</button>
        <button className="okado-secondary-action px-4 text-sm" onClick={() => { setAdmin(false); setOpen(true); }}>Confirmation marchand</button>
        {!active ? <p className="w-full text-xs text-ash">Le QR de diffusion n’ouvre le jeu qu’après sa publication.</p> : null}
      </div>
      <CampaignSavedDialog
        open={open} campaignId={admin ? "admin-qr-fixture" : "merchant-qr-fixture"} adminTargetName={admin ? "Commerce de test" : undefined}
        isActive={active} adminIsActive={active} onClose={() => setOpen(false)} onPreview={() => setOpen(false)}
      />
    </div>
    </MerchantShell>
  );
}
