"use client";

import { Check, Download, Eye, ImageIcon, QrCode, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogShell } from "@/components/ui/dialog";

type CampaignSavedDialogProps = {
  open: boolean;
  campaignId: string;
  onClose: () => void;
  onPreviewQr: () => void;
};

export function CampaignSavedDialog({
  open,
  campaignId,
  onClose,
  onPreviewQr,
}: CampaignSavedDialogProps) {
  return (
    <DialogShell
      open={open}
      onClose={onClose}
      labelledBy="campaign-saved-dialog-title"
      describedBy="campaign-saved-dialog-description"
    >
        <div className="flex items-start justify-between gap-4">
          <div
            aria-hidden="true"
            className="okado-dialog-icon bg-[#e9f8ec] text-[#18864b]"
          >
            <Check className="h-6 w-6" />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la confirmation d’enregistrement"
            className="okado-dialog-dismiss focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aubergine/30"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-ash">
          Jeu prêt
        </p>
        <h2 id="campaign-saved-dialog-title" className="okado-dialog-title">
          Votre jeu est enregistré.
        </h2>
        <p id="campaign-saved-dialog-description" className="okado-dialog-description max-w-xl">
          Testez le parcours ou reprenez sa configuration. Vous restez sur la campagne en cours.
        </p>

        <Button asChild variant="primary" size="default" className="mt-6 w-full">
          <a href={`/api/campaigns/${campaignId}/qr`} download>
            <Download className="h-4 w-4" aria-hidden="true" />
            Télécharger le QR code de diffusion
          </a>
        </Button>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Button asChild variant="default" size="default">
            <a href={`/campaign/${campaignId}?preview=1`} target="_blank" rel="noreferrer">
              <Eye className="h-4 w-4" aria-hidden="true" />
              Prévisualiser
            </a>
          </Button>
          <Button type="button" variant="default" size="default" onClick={onPreviewQr}>
            <QrCode className="h-4 w-4" aria-hidden="true" />
            QR de test
          </Button>
          <Button asChild variant="default" size="default">
            <a href={`/campaigns/${campaignId}/poster`}>
              <ImageIcon className="h-4 w-4" aria-hidden="true" />
              Affiche
            </a>
          </Button>
        </div>
    </DialogShell>
  );
}
