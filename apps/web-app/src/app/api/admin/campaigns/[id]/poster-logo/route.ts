import { NextResponse } from "next/server";

import { isSaasAdminEmail } from "@/lib/admin";
import { getAdminCampaignContext } from "@/lib/admin-campaign-repository";
import { getAuthenticatedSession } from "@/lib/auth";
import { getMerchantPosterLogoDataUrl } from "@/lib/merchant-image-storage";
import { getCampaignSetupPerformance } from "@/lib/store";

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
  if (!isSaasAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Accès réservé à l’administration." }, { status: 403 });
  }

  const { id } = await params;
  const context = await getAdminCampaignContext(id, session.user.email);
  if (!context) return NextResponse.json({ error: "Jeu introuvable." }, { status: 404 });

  const performance = await getCampaignSetupPerformance(id, context.location);
  if (!performance || performance.campaign.merchantId !== context.targetLocationId) {
    return NextResponse.json({ error: "Jeu introuvable." }, { status: 404 });
  }

  const imageUrl = new URL(request.url).searchParams.get("url");
  if (!imageUrl) {
    return NextResponse.json({ error: "Logo introuvable." }, { status: 400 });
  }

  try {
    const dataUrl = await getMerchantPosterLogoDataUrl(imageUrl, context.targetLocationId);
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
