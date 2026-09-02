"use client";

import { createPortal } from "react-dom";
import { Check, Download, Eye, ImageIcon, Pencil, X } from "lucide-react";
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
      className="fixed inset-0 z-[70] flex items-end justify-center bg-deep-plum/55 px-4 pb-4 pt-10 backdrop-blur-[6px] sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-saved-dialog-title"
        className="w-full max-w-[620px] rounded-[var(--okado-radius-modal)] border border-lavender-mist bg-white p-6 text-carbon shadow-[0_0_32px_rgba(0,0,0,0.1)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e9f8ec] text-[#18864b]"
          >
            <Check className="h-6 w-6" />
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer la confirmation d’enregistrement"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] border border-fog text-carbon transition hover:border-lavender-mist hover:bg-purple-haze focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aubergine/30"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-ash">
          Jeu prêt
        </p>
        <h2 id="campaign-saved-dialog-title" className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-carbon sm:text-3xl">
          Votre jeu est enregistré.
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-ash">
          Testez le parcours ou reprenez sa configuration. Vous restez sur la campagne en cours.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <a
            href={`/campaign/${campaignId}?preview=1`}
            target="_blank"
            rel="noreferrer"
            className="okado-filled-action !h-11 gap-2 px-4 text-sm"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            Prévisualiser
          </a>
          <button
            type="button"
            onClick={onPreviewQr}
            className="okado-secondary-action !h-11 gap-2 px-4 text-sm"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            QR de test
          </button>
          <a
            href={`/campaigns/${campaignId}/poster`}
            target="_blank"
            rel="noreferrer"
            className="okado-secondary-action !h-11 gap-2 px-4 text-sm"
          >
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
            Affiche
          </a>
        </div>

        <a
          href={`/api/campaigns/${campaignId}/qr`}
          download
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-aubergine underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aubergine/30"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Télécharger le QR code de diffusion
        </a>

        <div className="mt-7 border-t border-fog pt-5">
          <button
            type="button"
            onClick={onClose}
            className="okado-secondary-action w-full gap-2 px-4 text-sm"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Modifier le jeu
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
