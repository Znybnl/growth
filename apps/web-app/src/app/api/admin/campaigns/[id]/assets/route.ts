import { NextResponse } from "next/server";

import { isSaasAdminEmail } from "@/lib/admin";
import { getAdminCampaignContext } from "@/lib/admin-campaign-repository";
import { getAuthenticatedSession } from "@/lib/auth";
import { getCampaignSetupPerformance } from "@/lib/store";

type AdminCampaignAssetsRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: AdminCampaignAssetsRouteProps) {
  const session = await getAuthenticatedSession();
  if (!session) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
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

  return NextResponse.json({
    assets: {
      backgroundImageUrl: performance.campaign.presentation.background.imageUrl,
      posterLogoUrl: performance.campaign.presentation.poster.logoUrl,
      posterBackgroundImageUrl: performance.campaign.presentation.poster.backgroundImageUrl,
    },
  });
}
