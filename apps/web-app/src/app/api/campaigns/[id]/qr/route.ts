import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { createCampaignQrSvg } from "@/lib/campaign-exports";
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
  const publicUrl = `${origin}/campaign/${performance.campaign.id}`;
  const qrSvg = await createCampaignQrSvg(publicUrl);

  return new NextResponse(qrSvg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${performance.campaign.id}-qr.svg"`,
      "Cache-Control": "no-store",
    },
  });
}
