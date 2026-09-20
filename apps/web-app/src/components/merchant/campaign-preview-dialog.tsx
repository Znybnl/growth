"use client";

import { LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

export function CampaignPreviewDialog(props: {
  open: boolean;
  campaignId: string;
  onClose: () => void;
}) {
  return props.open ? <PreviewSession key={props.campaignId} {...props} /> : null;
}

function PreviewSession({
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
  const [attempt, setAttempt] = useState(0);
  const [scale, setScale] = useState(0.5);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameKey = `${campaignId}:${attempt}`;
  const isLoaded = loadedFrameKey === frameKey;
  const hasError = errorFrameKey === frameKey;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.max(0.1, Math.min(1, entry.contentRect.width / 390, entry.contentRect.height / 844)));
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isLoaded) return;
    const timer = window.setTimeout(() => setErrorFrameKey(frameKey), 20_000);
    return () => window.clearTimeout(timer);
  }, [frameKey, isLoaded]);

  if (!open) return null;

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      labelledBy="campaign-preview-dialog-title"
      describedBy="campaign-preview-dialog-description"
      className="okado-preview-dialog-surface"
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

      <div className="okado-preview-stage">
        <div ref={stageRef} className="okado-preview-stage-space">
        <div className="relative overflow-hidden rounded-[22px] bg-white shadow-lg" style={{ width: 390 * scale, height: 844 * scale }} aria-busy={!isLoaded && !hasError}>
          {!isLoaded && !hasError ? (
            <div className="okado-preview-loading" role="status">
              <div className="okado-preview-placeholder" aria-hidden="true"><span /><span /><div /></div>
              <LoaderCircle className="h-6 w-6 motion-safe:animate-spin text-aubergine" aria-hidden="true" />
              <p>Préparation de votre jeu…</p>
            </div>
          ) : null}
          {hasError ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white px-6 text-center" role="alert">
              <p className="font-semibold text-carbon">Prévisualisation indisponible</p>
              <p className="text-sm leading-6 text-charcoal">
                Le chargement prend plus de temps que prévu.
              </p>
              <button type="button" className="okado-secondary-action px-4" onClick={() => setAttempt(value => value + 1)}>Réessayer</button>
            </div>
          ) : null}
          <iframe
            key={frameKey}
            title="Prévisualisation mobile du jeu"
            src={PREVIEW_PATH(campaignId)}
            onLoad={() => { setLoadedFrameKey(frameKey); setErrorFrameKey(null); }}
            onError={() => setErrorFrameKey(frameKey)}
            className="absolute left-0 top-0 origin-top-left border-0 bg-white"
            style={{ width: 390, height: 844, transform: `scale(${scale})`, visibility: isLoaded && !hasError ? "visible" : "hidden" }}
            sandbox="allow-forms allow-same-origin allow-scripts"
          />
        </div>
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
