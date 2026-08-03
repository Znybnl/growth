import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { createCampaignQrSvg } from "@/lib/campaign-exports";
import { issuePreviewAccessToken } from "@/lib/preview-token";
import { getCampaignPerformance } from "@/lib/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const session = await requireAuthenticatedSession();
  const { id } = await context.params;
  const performance = await getCampaignPerformance(id, session.merchant);

  if (!performance || performance.campaign.merchantId !== session.merchant.id) {
    return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const searchParams = new URL(request.url).searchParams;
  const isPreview = searchParams.get("preview") === "1";
  const publicUrl = isPreview
    ? `${origin}/campaign/${performance.campaign.id}?${new URLSearchParams({
        preview: "1",
        previewToken: issuePreviewAccessToken(performance.campaign.id),
      })}`
    : `${origin}/campaign/${performance.campaign.id}`;
  const qrSvg = await createCampaignQrSvg(publicUrl);
  const inline = searchParams.get("inline") === "1";
  const filename = `${performance.campaign.id}-${isPreview ? "preview-qr" : "qr"}.svg`;

  return new NextResponse(qrSvg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
