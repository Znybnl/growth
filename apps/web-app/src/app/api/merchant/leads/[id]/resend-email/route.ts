import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { getSupabaseRewardEmailResendPayload } from "@/lib/campaign-repository";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { sendRewardEmail } from "@/lib/reward-email";

type LeadResendEmailRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: LeadResendEmailRouteProps) {
  try {
    assertTrustedMutationRequest(request);
    const session = await requireAuthenticatedSession();
    const { id } = await params;
    const payload = await getSupabaseRewardEmailResendPayload(id, session.merchant);
    const result = await sendRewardEmail({
      origin: new URL(request.url).origin,
      campaignId: payload.campaign.id,
      leadId: payload.lead.id,
      merchantName: payload.merchant.companyName,
      campaignTitle: payload.campaign.title,
      leadFirstName: payload.lead.firstName,
      leadEmail: payload.lead.email,
      prizeLabel: payload.prize.label,
      usageConditions: payload.prize.usageConditions,
      redemptionCode: payload.lead.redemptionCode ?? "",
      rewardWonAt: payload.lead.createdAt,
      rewardAvailableAt: payload.lead.rewardAvailableAt,
      rewardExpiresAt: payload.lead.rewardExpiresAt,
      purchaseRequired: payload.campaign.rewardRules.purchaseRequired,
      emailSettings: payload.campaign.presentation.email,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Renvoi impossible" },
      { status: getRequestSecurityErrorStatus(error) },
    );
  }
}
