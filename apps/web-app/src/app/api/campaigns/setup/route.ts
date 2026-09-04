import { after, NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";
import { CampaignComplianceError } from "@/lib/campaign-compliance";
import { parseCampaignSetupInput } from "@/lib/merchant-input";
import { captureProductEvent, merchantDistinctId } from "@/lib/product-analytics";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { updateCampaignSetup } from "@/lib/store";
import {
  emitServerError,
  flushServerTelemetry,
  hashTelemetryIdentifier,
  isServerTelemetryEnabled,
} from "@/lib/observability";
import { logSupportEvent } from "@/lib/support-log";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-vercel-id") || request.headers.get("x-request-id") || undefined;
  let telemetryContext: Record<
    string,
    string | number | boolean | undefined
  > = {
    route: "/api/campaigns/setup",
    http_method: request.method,
    request_id: requestId,
  };

  try {
    assertTrustedMutationRequest(request);
    const session = await getAuthenticatedSession();

    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const body = parseCampaignSetupInput(await request.json(), session.merchant.id);
    telemetryContext = {
      ...telemetryContext,
      campaign_id: body.id,
      merchant_hash: hashTelemetryIdentifier(session.merchant.id),
      user_hash: hashTelemetryIdentifier(session.user.id),
      creation_mode: body.creationMode ?? "editor",
      game_type: body.gameType,
    };

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
      creationMode: body.creationMode ?? "editor",
    });
    void captureProductEvent(
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
        creationMode: body.creationMode ?? "editor",
      },
    );
    if (savedCampaign.isActive) {
      void captureProductEvent(
        "campaign_published",
        merchantDistinctId(session.merchant.id, session.user.id),
        {
          merchantId: session.merchant.id,
          merchantUserId: session.user.id,
          campaignId: savedCampaign.id,
          gameType: savedCampaign.gameType,
          creationMode: body.creationMode ?? "editor",
        },
      );
    }

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    const status = getRequestSecurityErrorStatus(error) === 403
      ? 403
      : error instanceof CampaignComplianceError
        ? error.status
        : 500;
    const message =
      status === 403
        ? "Votre session de sécurité n'est plus valide ou la page a été ouverte depuis une adresse non autorisée. Rechargez la page depuis votre espace Okado puis réessayez."
        : error instanceof Error
          ? error.message
          : "Sauvegarde impossible.";

    emitServerError("campaign_setup_failed", error, {
      ...telemetryContext,
      http_status: status,
    });
    if (isServerTelemetryEnabled()) {
      after(() => flushServerTelemetry());
    }
    console.error("Campaign setup failed", error);

    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}
