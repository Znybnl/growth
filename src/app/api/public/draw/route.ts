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
import { logSupportEvent } from "@/lib/support-log";
import { drawForLead } from "@/lib/store";

type DrawBody = {
  campaignId: string;
  firstName: string;
  email: string;
  marketingConsent: boolean;
};

export async function POST(request: Request) {
  const body = (await request.json()) as DrawBody;
  const campaignId = body.campaignId?.trim() ?? "";
  const firstName = normalizePublicFirstName(body.firstName ?? "");
  const email = normalizePublicEmail(body.email ?? "");

  if (
    !isValidPublicIdentifier(campaignId) ||
    !isValidPublicFirstName(firstName) ||
    !isValidPublicEmail(email) ||
    !body.marketingConsent
  ) {
    return NextResponse.json(
      { error: "campaignId, firstName, email and marketingConsent are required" },
      { status: 400 },
    );
  }

  try {
    assertPublicRateLimit(request, {
      key: `draw-legacy:${campaignId}:${email}`,
      limit: 6,
      windowMs: 10 * 60 * 1000,
    });

    const result = await drawForLead({
      ...body,
      campaignId,
      firstName,
      email,
    });
    logSupportEvent("info", "draw-created", {
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
        logSupportEvent("error", "draw-email-failed", {
          campaignId: result.campaign.id,
          leadId: result.lead.id,
          error: emailError instanceof Error ? emailError.message : "Envoi e-mail impossible",
        });
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logSupportEvent("error", "draw-failed", {
      campaignId,
      email,
      error: error instanceof Error ? error.message : "Draw failed",
    });

    const retryAfter = getPublicRetryAfter(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Draw failed" },
      {
        status: getPublicErrorStatus(error),
        headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
      },
    );
  }
}
