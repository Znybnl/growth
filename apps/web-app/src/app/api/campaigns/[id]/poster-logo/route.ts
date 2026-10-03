import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";
import { getMerchantPosterLogoDataUrl } from "@/lib/merchant-image-storage";
import { getCampaignPerformance } from "@/lib/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: RouteContext) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const { id } = await params;
  const performance = await getCampaignPerformance(id, session.merchant);
  if (!performance || performance.campaign.merchantId !== session.merchant.id) {
    return NextResponse.json({ error: "Campagne introuvable." }, { status: 404 });
  }

  const imageUrl = new URL(request.url).searchParams.get("url");
  if (!imageUrl) {
    return NextResponse.json({ error: "Logo introuvable." }, { status: 400 });
  }

  try {
    const dataUrl = await getMerchantPosterLogoDataUrl(imageUrl, session.merchant.id);
    return NextResponse.json(
      { dataUrl },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de charger le logo." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
