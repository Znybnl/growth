import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";
import { parseCampaignSetupInput } from "@/lib/merchant-input";
import { captureProductEvent, merchantDistinctId } from "@/lib/product-analytics";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { updateCampaignSetup } from "@/lib/store";
import { logSupportEvent } from "@/lib/support-log";

export async function POST(request: Request) {
  try {
    assertTrustedMutationRequest(request);
    const session = await getAuthenticatedSession();

    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const body = parseCampaignSetupInput(await request.json(), session.merchant.id);

    const campaign = await updateCampaignSetup(body);
    if (!campaign) {
      throw new Error("La campagne n'a pas pu être enregistrée.");
    }

    const savedCampaign = "campaign" in campaign ? campaign.campaign : campaign;
    logSupportEvent("info", body.id ? "campaign_saved" : "campaign_created", {
      merchantId: session.merchant.id,
      merchantUserId: session.user.id,
      campaignId: savedCampaign.id,
      gameType: savedCampaign.gameType,
      isActive: savedCampaign.isActive,
    });
    await captureProductEvent(
      body.id ? "campaign_saved" : "campaign_created",
      merchantDistinctId(session.merchant.id, session.user.id),
      {
        merchantId: session.merchant.id,
        merchantUserId: session.user.id,
        campaignId: savedCampaign.id,
        gameType: savedCampaign.gameType,
        actionsCount: body.actions.length,
        prizesCount: body.prizes.length,
        isActive: savedCampaign.isActive,
      },
    );
    if (savedCampaign.isActive) {
      await captureProductEvent(
        "campaign_published",
        merchantDistinctId(session.merchant.id, session.user.id),
        {
          merchantId: session.merchant.id,
          merchantUserId: session.user.id,
          campaignId: savedCampaign.id,
          gameType: savedCampaign.gameType,
        },
      );
    }

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error("Campaign setup failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sauvegarde impossible." },
      { status: getRequestSecurityErrorStatus(error) === 403 ? 403 : 500 },
    );
  }
}
