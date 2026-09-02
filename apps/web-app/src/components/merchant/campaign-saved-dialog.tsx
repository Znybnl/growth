"use client";

import { createPortal } from "react-dom";
import { Check, Download, Eye, ImageIcon, QrCode, X } from "lucide-react";
import { useEffect, useRef } from "react";

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
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="okado-dialog-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-saved-dialog-title"
        className="okado-dialog-surface"
      >
        <div className="flex items-start justify-between gap-4">
          <div
            aria-hidden="true"
            className="okado-dialog-icon bg-[#e9f8ec] text-[#18864b]"
          >
            <Check className="h-6 w-6" />
          </div>
          <button
            ref={closeButtonRef}
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
        <p className="okado-dialog-description max-w-xl">
          Testez le parcours ou reprenez sa configuration. Vous restez sur la campagne en cours.
        </p>

        <a
          href={`/api/campaigns/${campaignId}/qr`}
          download
          className="okado-filled-action mt-6 !h-11 w-full gap-2 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aubergine/30"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Télécharger le QR code de diffusion
        </a>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <a
            href={`/campaign/${campaignId}?preview=1`}
            target="_blank"
            rel="noreferrer"
            className="okado-secondary-action !h-11 gap-2 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aubergine/30"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            Prévisualiser
          </a>
          <button
            type="button"
            onClick={onPreviewQr}
            className="okado-secondary-action !h-11 gap-2 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aubergine/30"
          >
            <QrCode className="h-4 w-4" aria-hidden="true" />
            QR de test
          </button>
          <a
            href={`/campaigns/${campaignId}/poster`}
            target="_blank"
            rel="noreferrer"
            className="okado-secondary-action !h-11 gap-2 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aubergine/30"
          >
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
            Affiche
          </a>
        </div>
      </section>
    </div>,
    document.body,
  );
}
