import { after, NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";
import { CampaignComplianceError } from "@/lib/campaign-compliance";
import { parseCampaignSetupInput } from "@/lib/merchant-input";
import { captureProductEvent, merchantDistinctId } from "@/lib/product-analytics";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { saveCampaignSetup } from "@/lib/store";
import {
  emitServerError,
  flushServerTelemetry,
  hashTelemetryIdentifier,
  isServerTelemetryEnabled,
} from "@/lib/observability";
import { logSupportEvent } from "@/lib/support-log";

export async function POST(request: Request) {
  const requestStartedAt = performance.now();
  const requestId = request.headers.get("x-vercel-id") || request.headers.get("x-request-id") || undefined;
  let authMs = 0;
  let parseMs = 0;
  let saveMs = 0;
  let saveContext: Record<string, string | number | boolean | undefined> = {};
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
    const authStartedAt = performance.now();
    const session = await getAuthenticatedSession();
    authMs = Math.round((performance.now() - authStartedAt) * 10) / 10;

    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const parseStartedAt = performance.now();
    const body = parseCampaignSetupInput(await request.json(), session.merchant.id);
    parseMs = Math.round((performance.now() - parseStartedAt) * 10) / 10;
    saveContext = {
      mode: body.id ? "update" : "create",
      game_type: body.gameType,
      is_active: body.isActive,
      actions_count: body.actions.length,
      prizes_count: body.prizes.length,
    };
    telemetryContext = {
      ...telemetryContext,
      campaign_id: body.id,
      merchant_hash: hashTelemetryIdentifier(session.merchant.id),
      user_hash: hashTelemetryIdentifier(session.user.id),
      creation_mode: body.creationMode ?? "editor",
      game_type: body.gameType,
    };

    const saveStartedAt = performance.now();
    const savedCampaignId = await saveCampaignSetup(body);
    saveMs = Math.round((performance.now() - saveStartedAt) * 10) / 10;
    if (!savedCampaignId) {
      throw new Error("La campagne n'a pas pu être enregistrée.");
    }

    logSupportEvent("info", body.id ? "campaign_saved" : "campaign_created", {
      merchantId: session.merchant.id,
      merchantUserId: session.user.id,
      campaignId: savedCampaignId,
      gameType: body.gameType,
      isActive: body.isActive,
      creationMode: body.creationMode ?? "editor",
    });
    void captureProductEvent(
      body.id ? "campaign_saved" : "campaign_created",
      merchantDistinctId(session.merchant.id, session.user.id),
      {
        merchantId: session.merchant.id,
        merchantUserId: session.user.id,
        campaignId: savedCampaignId,
        gameType: body.gameType,
        actionsCount: body.actions.length,
        prizesCount: body.prizes.length,
        isActive: body.isActive,
        creationMode: body.creationMode ?? "editor",
      },
    );
    if (body.isActive) {
      void captureProductEvent(
        "campaign_published",
        merchantDistinctId(session.merchant.id, session.user.id),
        {
          merchantId: session.merchant.id,
          merchantUserId: session.user.id,
          campaignId: savedCampaignId,
          gameType: body.gameType,
          creationMode: body.creationMode ?? "editor",
        },
      );
    }

    const totalMs = Math.round((performance.now() - requestStartedAt) * 10) / 10;
    const contentLength = Number(request.headers.get("content-length"));
    const clientSerializationMs = Number(
      request.headers.get("x-okado-setup-serialize-ms") ?? Number.NaN,
    );
    const clientPayloadChars = Number(request.headers.get("x-okado-setup-payload-chars"));
    const timing = {
      event: "campaign_setup_timing",
      route: "/api/campaigns/setup",
      request_id: requestId,
      status: 201,
      ...saveContext,
      payload_bytes: Number.isFinite(contentLength) && contentLength > 0 ? contentLength : undefined,
      payload_chars:
        Number.isFinite(clientPayloadChars) && clientPayloadChars > 0 && clientPayloadChars <= 20_000_000
          ? clientPayloadChars
          : undefined,
      client_serialize_ms:
        Number.isFinite(clientSerializationMs) && clientSerializationMs >= 0 && clientSerializationMs <= 60_000
          ? clientSerializationMs
          : undefined,
      auth_ms: authMs,
      parse_ms: parseMs,
      save_ms: saveMs,
      total_ms: totalMs,
    };
    console.info(JSON.stringify(timing));

    return NextResponse.json(
      { campaign: { id: savedCampaignId } },
      {
        status: 201,
        headers: {
          "Server-Timing": `auth;dur=${authMs}, parse;dur=${parseMs}, save;dur=${saveMs}`,
        },
      },
    );
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
    console.info(JSON.stringify({
      event: "campaign_setup_timing",
      route: "/api/campaigns/setup",
      request_id: requestId,
      status,
      ...saveContext,
      auth_ms: authMs,
      parse_ms: parseMs,
      save_ms: saveMs,
      total_ms: Math.round((performance.now() - requestStartedAt) * 10) / 10,
    }));
    if (isServerTelemetryEnabled()) {
      after(() => flushServerTelemetry());
    }
    console.error(JSON.stringify({
      event: "campaign_setup_failed",
      route: "/api/campaigns/setup",
      request_id: requestId,
      status,
      total_ms: Math.round((performance.now() - requestStartedAt) * 10) / 10,
    }));

    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}
