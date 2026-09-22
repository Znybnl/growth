import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { getCampaignPerformance, updateCampaignPosterSettings } from "@/lib/store";
import { CampaignPosterSettings } from "@/lib/types";

type PosterSettingsRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: PosterSettingsRouteProps) {
  try {
    assertTrustedMutationRequest(request);
    const session = await requireAuthenticatedSession();
    const { id } = await params;
    const payload = (await request.json()) as
      | CampaignPosterSettings
      | { poster: CampaignPosterSettings; wheelSubtitle?: string };
    const poster = "poster" in payload ? payload.poster : payload;
    const wheelSubtitle = "poster" in payload ? payload.wheelSubtitle : undefined;
    const performance = await getCampaignPerformance(id, session.merchant);

    if (!performance || performance.campaign.merchantId !== session.merchant.id) {
      return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
    }

    await updateCampaignPosterSettings(id, poster, session.merchant.id, wheelSubtitle);

    return NextResponse.json({ campaign: performance.campaign });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Mise à jour impossible" },
      { status: getRequestSecurityErrorStatus(error) },
    );
  }
}
