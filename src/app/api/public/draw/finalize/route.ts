import { NextResponse } from "next/server";

import {
  assertPublicRateLimit,
  getPublicErrorStatus,
  getPublicRetryAfter,
  isValidPublicEmail,
  isValidPublicFirstName,
  isValidPublicIdentifier,
  normalizePublicEmail,
  normalizePublicFirstName,
} from "@/lib/public-api";
import { sendRewardEmail } from "@/lib/reward-email";
import { finalizeDrawSession } from "@/lib/store";
import { logSupportEvent } from "@/lib/support-log";
import { DrawResult, FinalizeDrawSessionRequest } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as FinalizeDrawSessionRequest;
  const sessionId = body.sessionId?.trim() ?? "";
  const firstName = normalizePublicFirstName(body.firstName ?? "");
  const email = normalizePublicEmail(body.email ?? "");

  if (
    !isValidPublicIdentifier(sessionId) ||
    !isValidPublicFirstName(firstName) ||
    !isValidPublicEmail(email)
  ) {
    return NextResponse.json(
      { error: "sessionId, firstName and email are required" },
      { status: 400 },
    );
  }

  try {
    assertPublicRateLimit(request, {
      key: `draw-finalize:${sessionId}:${email}`,
      limit: 6,
      windowMs: 10 * 60 * 1000,
    });

    const result = (await finalizeDrawSession({
      ...body,
      sessionId,
      firstName,
      email,
    })) as DrawResult;
    logSupportEvent("info", "draw-finalized", {
      campaignId: result.campaign.id,
      leadId: result.lead.id,
      email: result.lead.email,
      prizeId: result.lead.prizeId,
      status: result.lead.status,
    });

    if (result.prize && result.lead.redemptionCode) {
      try {
        await sendRewardEmail({
          origin: new URL(request.url).origin,
          campaignId: result.campaign.id,
          leadId: result.lead.id,
          merchantName: result.campaign.merchantName,
          campaignTitle: result.campaign.title,
          leadFirstName: result.lead.firstName,
          leadEmail: result.lead.email,
          prizeLabel: result.prize.label,
          usageConditions: result.prize.usageConditions,
          redemptionCode: result.lead.redemptionCode,
          rewardAvailableAt: result.lead.rewardAvailableAt,
          rewardExpiresAt: result.lead.rewardExpiresAt,
          purchaseRequired: result.campaign.rewardRules.purchaseRequired,
          emailSettings: result.campaign.presentation.email,
        });
      } catch (emailError) {
        logSupportEvent("error", "draw-finalize-email-failed", {
          campaignId: result.campaign.id,
          leadId: result.lead.id,
          error: emailError instanceof Error ? emailError.message : "Envoi e-mail impossible",
        });
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logSupportEvent("error", "draw-finalize-failed", {
      sessionId,
      email,
      error: error instanceof Error ? error.message : "Draw finalize failed",
    });

    const retryAfter = getPublicRetryAfter(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Draw finalize failed" },
      {
        status: getPublicErrorStatus(error),
        headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
      },
    );
  }
}
