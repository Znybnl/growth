"use client";

import { LoaderCircle, X } from "lucide-react";
import { useState } from "react";

import { DialogShell } from "@/components/ui/dialog";

const PREVIEW_PATH = (campaignId: string) => `/campaign/${campaignId}/preview-embed?preview=1`;

/**
 * Opens the full-page preview on narrow screens and the mobile viewport dialog on desktop.
 * The breakpoint matches the desktop behaviour defined for the merchant workspace.
 */
export function openCampaignPreview(
  campaignId: string,
  onDesktopOpen: () => void,
  onMobileNavigate: (path: string) => void,
) {
  if (typeof window === "undefined") return;

  if (window.matchMedia("(min-width: 768px)").matches) {
    onDesktopOpen();
    return;
  }

  onMobileNavigate(`/campaign/${campaignId}?preview=1`);
}

export function CampaignPreviewDialog({
  open,
  campaignId,
  onClose,
}: {
  open: boolean;
  campaignId: string;
  onClose: () => void;
}) {
  const [loadedFrameKey, setLoadedFrameKey] = useState<string | null>(null);
  const [errorFrameKey, setErrorFrameKey] = useState<string | null>(null);
  const frameKey = `${campaignId}:${open ? "open" : "closed"}`;
  const isLoaded = loadedFrameKey === frameKey;
  const hasError = errorFrameKey === frameKey;

  if (!open) return null;

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      labelledBy="campaign-preview-dialog-title"
      describedBy="campaign-preview-dialog-description"
      className="okado-preview-dialog-surface max-w-[min(30rem,calc(100vw-2rem))] overflow-hidden p-0 sm:p-0"
    >
      <div className="flex items-start justify-between gap-4 border-b border-fog px-5 py-4 sm:px-6">
        <div>
          <p className="okado-label">Aperçu du jeu</p>
          <h2 id="campaign-preview-dialog-title" className="mt-1 text-lg font-semibold text-carbon">
            Version mobile
          </h2>
          <p id="campaign-preview-dialog-description" className="mt-1 text-sm text-charcoal">
            Vérifiez le parcours tel qu&apos;il apparaîtra sur un téléphone.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la prévisualisation"
          className="okado-dialog-dismiss h-9 w-9"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex justify-center bg-[#f6f1f8] px-4 py-5 sm:px-6 sm:py-6">
        <div className="relative w-[min(390px,calc(100vw-4rem),calc((100dvh-12rem)*0.462))] overflow-hidden rounded-[26px] bg-white shadow-[0_18px_44px_rgba(72,26,84,0.18)] aspect-[390/844]">
          {!isLoaded && !hasError ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white text-sm text-charcoal" aria-live="polite">
              <LoaderCircle className="h-5 w-5 animate-spin text-aubergine" aria-hidden="true" />
              Chargement de la prévisualisation…
            </div>
          ) : null}
          {hasError ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white px-6 text-center" role="alert">
              <p className="font-semibold text-carbon">Prévisualisation indisponible</p>
              <p className="text-sm leading-6 text-charcoal">
                Fermez cette fenêtre puis relancez la prévisualisation.
              </p>
            </div>
          ) : null}
          <iframe
            title="Prévisualisation mobile du jeu"
            src={PREVIEW_PATH(campaignId)}
            onLoad={() => setLoadedFrameKey(frameKey)}
            onError={() => setErrorFrameKey(frameKey)}
            className="h-full w-full border-0 bg-white"
            sandbox="allow-forms allow-same-origin allow-scripts"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-fog px-5 py-3 sm:px-6">
        <p className="text-xs text-ash">Viewport de référence : 390 × 844 px</p>
        <button type="button" onClick={onClose} className="okado-secondary-action px-4">
          Fermer
        </button>
      </div>
    </DialogShell>
  );
}
