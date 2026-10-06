import { after, NextRequest, NextResponse } from "next/server";

import {
  getSupabaseCampaignPerformance,
  getSupabaseRetryableRewardEmailCandidates,
  getSupabaseRewardEmailResendPayload,
} from "@/lib/campaign-repository";
import { sendRewardEmail } from "@/lib/reward-email";
import { logSupportEvent } from "@/lib/support-log";
import { getSupabaseAdmin } from "@/lib/supabase";
import { purgeUnreferencedMerchantImages } from "@/lib/merchant-image-storage";
import { dispatchMerchantGainNotifications } from "@/lib/merchant-gain-notifications";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Reuse the existing daily maintenance as a recovery pass within Resend's
  // idempotency window. SQL's local cutoff excludes the new morning digests.
  // Register before purges: a maintenance failure must not disable recovery.
  after(async () => {
    try {
      const notifications = await dispatchMerchantGainNotifications(undefined, 200, {
        budgetMs: Math.max(0, 240_000 - (Date.now() - startedAt)), minIntervalMs: 600,
      });
      if (!notifications.skipped) logSupportEvent(
        notifications.failed || notifications.limitReached ? "error" : "info",
        "merchant_gain_notification_recovery", notifications,
      );
    } catch {
      logSupportEvent("error", "merchant_gain_notification_recovery_failed", {});
    }
  });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("purge_operational_data");
  if (error) {
    logSupportEvent("error", "maintenance_purge_failed", { error: error.message });
    return NextResponse.json({ error: "Maintenance impossible" }, { status: 500 });
  }

  const { data: lifecycleData, error: lifecycleError } = await supabase.rpc("purge_personal_data");
  if (lifecycleError && !/function .*purge_personal_data.*does not exist|could not find the function/i.test(lifecycleError.message)) {
    logSupportEvent("error", "personal_data_lifecycle_failed", { error: lifecycleError.message });
    return NextResponse.json({ error: "Cycle de vie des données impossible" }, { status: 500 });
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
        purchaseRequired: Boolean(payload.prize.purchaseRequired),
        appointmentUrl: payload.merchant.appointmentUrl,
        emailSettings: payload.campaign.presentation.email,
        logoUrl: payload.campaign.logoUrl,
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

  const result = { ...(data ?? {}), personalDataLifecycle: lifecycleData ?? null, retried, retryFailures };
  try {
    const deletedMerchantImages = await purgeUnreferencedMerchantImages();
    Object.assign(result, { deletedMerchantImages });
  } catch (cleanupError) {
    // Image orphan cleanup must not block other scheduled maintenance work.
    logSupportEvent("error", "merchant_image_cleanup_failed", {
      error: cleanupError instanceof Error ? cleanupError.message : "Cleanup failed",
    });
  }
  logSupportEvent("info", "maintenance_purge_completed", { result });
  return NextResponse.json({ ok: true, result });
}
