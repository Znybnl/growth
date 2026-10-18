"use client";

import Image from "next/image";
import { useState } from "react";
import { LoaderCircle, X } from "lucide-react";

import { DialogShell } from "@/components/ui/dialog";

function PreviewQrImage({ endpoint }: { endpoint: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  // Keep the authenticated endpoint and preview parameters on every retry.
  const src = attempt === 0 ? endpoint : `${endpoint}${endpoint.includes("?") ? "&" : "?"}qrRetry=${attempt}`;

  return (
    <div className="relative h-48 w-48 max-w-full shrink-0 rounded-[12px] border border-[#edf1f7] bg-white" aria-busy={status === "loading"}>
      {status !== "error" ? (
        <Image
          key={attempt}
          src={src}
          alt="QR code de prévisualisation — réservé aux tests, ne pas transmettre aux clients"
          width={192}
          height={192}
          unoptimized
          loading="eager"
          draggable={false}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className={`h-full w-full select-none rounded-[12px] p-2 ${status === "loaded" ? "opacity-100" : "opacity-0"}`}
        />
      ) : null}
      {status === "loading" ? (
        <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-3 text-center text-sm text-charcoal">
          <LoaderCircle className="h-6 w-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Chargement du QR code…
        </div>
      ) : null}
      {status === "error" ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-3 text-center text-sm text-charcoal">
          <p role="alert">Impossible de charger le QR code de test.</p>
          <button type="button" className="okado-secondary-action px-3 text-sm" onClick={() => {
            setStatus("loading");
            setAttempt((value) => value + 1);
          }}>Réessayer</button>
        </div>
      ) : null}
    </div>
  );
}

export function CampaignPreviewQr({ campaignId, qrEndpoint }: { campaignId: string; qrEndpoint?: string }) {
  const endpoint = qrEndpoint ?? `/api/campaigns/${encodeURIComponent(campaignId)}/qr?preview=1&inline=1`;
  return (
    <div
      className="okado-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
      onContextMenu={(event) => event.preventDefault()}
    >
      <PreviewQrImage key={`${campaignId}:${endpoint}`} endpoint={endpoint} />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-charcoal">
          QR de prévisualisation — test uniquement
        </p>
        <p className="mt-2 text-sm leading-6 text-charcoal">
          Scannez ce code pour tester le parcours sans utiliser le QR de la campagne. Les
          participations sont isolées et ne décrémentent pas les lots. Ne transmettez pas ce QR
          code à vos clients.
        </p>
        <p className="mt-2 text-xs font-semibold text-charcoal">
          Validité : 30 minutes après sa génération.
        </p>
      </div>
    </div>
  );
}

export function CampaignPreviewQrDialog({
  open,
  campaignId,
  onClose,
  qrEndpoint,
}: {
  open: boolean;
  campaignId: string;
  onClose: () => void;
  qrEndpoint?: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <DialogShell open={open} onClose={onClose} labelledBy="campaign-preview-qr-title" className="max-w-[620px] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">QR code</p>
            <h2 id="campaign-preview-qr-title" className="mt-2 text-2xl font-semibold text-carbon">
              Prévisualisation
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#5c6577]">
              Ce QR code est réservé à vos tests et ne doit pas être transmis aux clients.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la prévisualisation du QR code"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] border border-fog text-carbon transition hover:border-lavender-mist hover:bg-purple-haze"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6">
          <CampaignPreviewQr campaignId={campaignId} qrEndpoint={qrEndpoint} />
        </div>

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className="okado-secondary-action px-5">
            Fermer
          </button>
        </div>
    </DialogShell>
  );
}
