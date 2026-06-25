"use client";

import { useEffect, useRef, useState } from "react";

import { DeleteCampaignButton } from "@/components/merchant/delete-campaign-button";
import { DuplicateCampaignButton } from "@/components/merchant/duplicate-campaign-button";

type CampaignActionsMenuProps = {
  campaignId: string;
  campaignTitle: string;
};

export function CampaignActionsMenu({
  campaignId,
  campaignTitle,
}: CampaignActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative ml-auto">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-[40px] w-[40px] cursor-pointer items-center justify-center rounded-[14px] border border-[#d7e0ed] bg-white text-[#182033] transition hover:border-[#c5d2e5] hover:bg-[#f8fbff]"
        aria-expanded={open}
        aria-label="Ouvrir les actions de la campagne"
      >
        <span className="flex h-[14px] flex-col items-center justify-between">
          <span className="h-[3px] w-[3px] rounded-full bg-current" />
          <span className="h-[3px] w-[3px] rounded-full bg-current" />
          <span className="h-[3px] w-[3px] rounded-full bg-current" />
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+12px)] z-20 w-[min(248px,calc(100vw-24px))] rounded-[22px] border border-[#dfe6f0] bg-white p-3 shadow-[0_18px_40px_rgba(122,136,166,0.14)] max-sm:right-0">
          <div className="flex flex-col gap-2">
            <a
              href={`/api/campaigns/${campaignId}/qr`}
              className="inline-flex min-h-[48px] cursor-pointer items-center rounded-[16px] border border-[#d7e0ed] px-4 py-3 text-sm font-semibold text-[#182033] transition hover:border-[#c5d2e5] hover:bg-[#f8fbff]"
              onClick={() => setOpen(false)}
            >
              Exporter le QR code
            </a>
            <a
              href={`/campaigns/${campaignId}/poster`}
              className="inline-flex min-h-[48px] cursor-pointer items-center rounded-[16px] border border-[#d7e0ed] px-4 py-3 text-sm font-semibold text-[#182033] transition hover:border-[#c5d2e5] hover:bg-[#f8fbff]"
              onClick={() => setOpen(false)}
            >
              Personnaliser l&apos;affiche
            </a>
            <a
              href={`/campaigns/${campaignId}/email`}
              className="inline-flex min-h-[48px] cursor-pointer items-center rounded-[16px] border border-[#d7e0ed] px-4 py-3 text-sm font-semibold text-[#182033] transition hover:border-[#c5d2e5] hover:bg-[#f8fbff]"
              onClick={() => setOpen(false)}
            >
              Email client
            </a>
            <a
              href={`/api/campaigns/${campaignId}/poster`}
              className="inline-flex min-h-[48px] cursor-pointer items-center rounded-[16px] bg-[#2f6df6] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#245dd8]"
              onClick={() => setOpen(false)}
            >
              Télécharger l&apos;affiche A4
            </a>
            <DuplicateCampaignButton
              campaignId={campaignId}
              className="min-h-[48px] justify-start"
              onDone={() => setOpen(false)}
            />
            <DeleteCampaignButton
              campaignId={campaignId}
              campaignTitle={campaignTitle}
              className="min-h-[48px] justify-start"
              onDone={() => setOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
