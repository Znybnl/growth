import { NextRequest, NextResponse } from "next/server";

import {
  getSupabaseCampaignPerformance,
  getSupabaseRetryableRewardEmailCandidates,
  getSupabaseRewardEmailResendPayload,
} from "@/lib/campaign-repository";
import { sendRewardEmail } from "@/lib/reward-email";
import { logSupportEvent } from "@/lib/support-log";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("purge_operational_data");
  if (error) {
    logSupportEvent("error", "maintenance_purge_failed", { error: error.message });
    return NextResponse.json({ error: "Maintenance impossible" }, { status: 500 });
  }

  const retries = await getSupabaseRetryableRewardEmailCandidates(20);
  let retried = 0;
  let retryFailures = 0;
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? request.nextUrl.origin;

  for (const candidate of retries) {
    try {
      const performance = await getSupabaseCampaignPerformance(candidate.campaign_id);
      if (!performance) continue;
      const payload = await getSupabaseRewardEmailResendPayload(candidate.lead_id, performance.merchant);
      await sendRewardEmail({
        origin,
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
      retried += 1;
    } catch (retryError) {
      retryFailures += 1;
      logSupportEvent("error", "reward_email_retry_failed", {
        campaignId: candidate.campaign_id,
        leadId: candidate.lead_id,
        error: retryError instanceof Error ? retryError.message : "Retry failed",
      });
    }
  }

  const result = { ...(data ?? {}), retried, retryFailures };
  logSupportEvent("info", "maintenance_purge_completed", { result });
  return NextResponse.json({ ok: true, result });
}
