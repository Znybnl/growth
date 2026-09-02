"use client";

import Image from "next/image";
import { X } from "lucide-react";

export function CampaignPreviewQr({ campaignId }: { campaignId: string }) {
  return (
    <div
      className="okado-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
      onContextMenu={(event) => event.preventDefault()}
    >
      <Image
        src={`/api/campaigns/${campaignId}/qr?preview=1&inline=1`}
        alt="QR code de prévisualisation — réservé aux tests, ne pas transmettre aux clients"
        width={192}
        height={192}
        unoptimized
        draggable={false}
        className="h-48 w-48 shrink-0 select-none rounded-[12px] border border-[#edf1f7] bg-white p-2"
      />
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
}: {
  open: boolean;
  campaignId: string;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-deep-plum/55 px-4 pb-4 pt-10 backdrop-blur-[6px] sm:items-center sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-preview-qr-title"
        className="w-full max-w-[620px] rounded-[var(--okado-radius-modal)] border border-lavender-mist bg-white p-5 text-carbon shadow-[0_0_32px_rgba(0,0,0,0.1)] sm:p-6"
      >
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
          <CampaignPreviewQr campaignId={campaignId} />
        </div>

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className="okado-secondary-action px-5">
            Fermer
          </button>
        </div>
      </section>
    </div>
  );
}
