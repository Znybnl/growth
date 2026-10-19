"use client";

import { CampaignQrDownload } from "@/components/merchant/campaign-qr-download";

/** Render only from an admin screen; the route still enforces authorization. */
export function AdminCampaignQrDownload(props: {
  campaignId: string; isActive?: boolean; className?: string; label?: string;
}) {
  return <CampaignQrDownload {...props} admin label={props.label ?? "Télécharger le QR de diffusion"} />;
}
