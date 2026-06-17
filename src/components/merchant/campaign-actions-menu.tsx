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
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="cursor-pointer rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 text-sm font-semibold text-[#182033]"
        aria-expanded={open}
      >
        Plus
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+12px)] z-20 min-w-[220px] rounded-[22px] border border-[#dfe6f0] bg-white p-3 shadow-[0_18px_40px_rgba(122,136,166,0.14)]">
          <div className="flex flex-col gap-2">
            <a
              href={`/api/campaigns/${campaignId}/qr`}
              className="rounded-[16px] border border-[#d7e0ed] px-4 py-3 text-sm font-semibold text-[#182033]"
              onClick={() => setOpen(false)}
            >
              Exporter le QR code
            </a>
            <a
              href={`/api/campaigns/${campaignId}/poster`}
              className="rounded-[16px] bg-[#2f6df6] px-4 py-3 text-sm font-semibold !text-white"
              onClick={() => setOpen(false)}
            >
              Télécharger l&apos;affiche A4
            </a>
            <DuplicateCampaignButton campaignId={campaignId} />
            <DeleteCampaignButton campaignId={campaignId} campaignTitle={campaignTitle} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
