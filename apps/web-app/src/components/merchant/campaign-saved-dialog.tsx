"use client";

import { Check, Eye, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogShell } from "@/components/ui/dialog";
import { CampaignQrPanel } from "@/components/merchant/campaign-qr-download";

type CampaignSavedDialogProps = {
  open: boolean;
  campaignId: string;
  isActive?: boolean;
  adminTargetName?: string;
  adminIsActive?: boolean;
  onClose: () => void;
  onPreview: () => void;
};

export function CampaignSavedDialog({
  open, campaignId, isActive, adminTargetName, adminIsActive, onClose, onPreview,
}: CampaignSavedDialogProps) {
  const published = adminTargetName ? adminIsActive === true : isActive === true;
  return (
    <DialogShell open={open} onClose={onClose} labelledBy="campaign-saved-dialog-title"
      describedBy="campaign-saved-dialog-description"
      className="!max-w-2xl max-h-[calc(100dvh-3.5rem)] overflow-y-auto">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e9f8ec] text-[#18864b]"><Check className="h-5 w-5" /></span>
          <p role="status" className="text-xs font-semibold uppercase tracking-[0.14em] text-ash">
            {published ? "Jeu publié" : "Brouillon enregistré"}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer la confirmation d’enregistrement"
          className="okado-dialog-dismiss focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aubergine/30">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,1fr)_248px] sm:items-center sm:gap-7">
      <div className="min-w-0">
      <h2 id="campaign-saved-dialog-title" className="okado-dialog-title !mt-0">
        {adminTargetName
          ? published ? `Le jeu est publié pour ${adminTargetName}.` : `Le brouillon est prêt pour ${adminTargetName}.`
          : "Votre jeu est enregistré."}
      </h2>
      <p id="campaign-saved-dialog-description" className="mt-2 text-sm leading-relaxed text-ash">
        {published ? "Votre jeu est prêt à être partagé." : "Ce QR donnera accès au jeu après publication."}
      </p>
      <Button type="button" variant="primary" className="mt-5 w-full" onClick={onPreview}>
        <Eye className="h-4 w-4" aria-hidden="true" />Prévisualiser mon jeu
      </Button>
      <a href={`/${adminTargetName ? "admin/" : ""}campaigns/${encodeURIComponent(campaignId)}/poster`}
        className="mt-4 flex min-h-11 items-center justify-center gap-2 text-sm font-medium text-aubergine underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aubergine/30">
        <ImageIcon className="h-4 w-4" aria-hidden="true" />Affiche
      </a>
      </div>
      {open ? <div className="min-w-0 border-t border-border pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
        <p className="text-center text-sm font-semibold text-carbon">QR code de participation</p>
        <CampaignQrPanel key={campaignId} campaignId={campaignId} admin={Boolean(adminTargetName)} />
      </div> : null}
      </div>
    </DialogShell>
  );
}
