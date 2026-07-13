import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";
import { getCampaignSetupPerformance } from "@/lib/store";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }

  const { id } = await params;
  const campaign = await getCampaignSetupPerformance(id, session.merchant);

  if (!campaign || campaign.campaign.merchantId !== session.merchant.id) {
    return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    assets: {
      logoUrl: campaign.campaign.logoUrl,
      backgroundImageUrl: campaign.campaign.presentation.background.imageUrl,
      posterLogoUrl: campaign.campaign.presentation.poster.logoUrl,
      posterBackgroundImageUrl: campaign.campaign.presentation.poster.backgroundImageUrl,
    },
  });
}
