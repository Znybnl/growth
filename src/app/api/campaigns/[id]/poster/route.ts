import { NextResponse } from "next/server";
import sharp from "sharp";

import { requireAuthenticatedSession } from "@/lib/auth";
import { createCampaignPosterSvg } from "@/lib/campaign-exports";
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
  const posterSvg = await createCampaignPosterSvg(performance, publicUrl);
  const posterPng = await sharp(Buffer.from(posterSvg)).png().toBuffer();

  return new NextResponse(new Uint8Array(posterPng), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${performance.campaign.id}-affiche-a4.png"`,
      "Cache-Control": "no-store",
    },
  });
}
