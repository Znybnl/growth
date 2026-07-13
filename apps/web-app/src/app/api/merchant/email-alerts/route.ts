import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

const ATTENTION_STATUSES = ["failed", "bounced", "complained", "suppressed"];

export async function GET() {
  const session = await requireAuthenticatedSession();
  const supabase = getSupabaseAdmin();
  const { data: campaigns, error: campaignError } = await supabase
    .from("campaigns")
    .select("id")
    .eq("merchant_id", session.merchant.id);

  if (campaignError) {
    return NextResponse.json({ error: "Lecture des alertes impossible" }, { status: 500 });
  }

  const campaignIds = (campaigns ?? []).map((campaign) => campaign.id);
  if (!campaignIds.length) {
    return NextResponse.json({
      emailCount: 0,
      emailCampaignId: null,
      lowStockCount: 0,
      exhaustedStockCount: 0,
      stockCampaignId: null,
    });
  }

  const [deliveryResult, prizeResult, latestAttentionResult] = await Promise.all([
    supabase
      .from("reward_email_deliveries")
      .select("id", { count: "exact", head: true })
      .in("campaign_id", campaignIds)
      .in("status", ATTENTION_STATUSES),
    supabase
      .from("prizes")
      .select("campaign_id, total_quantity, remaining_quantity")
      .in("campaign_id", campaignIds),
    supabase
      .from("reward_email_deliveries")
      .select("campaign_id")
      .in("campaign_id", campaignIds)
      .in("status", ATTENTION_STATUSES)
      .order("updated_at", { ascending: false })
      .limit(1),
  ]);

  if (deliveryResult.error || prizeResult.error || latestAttentionResult.error) {
    return NextResponse.json({ error: "Lecture des alertes impossible" }, { status: 500 });
  }

  const stockAlerts = (prizeResult.data ?? []).reduce(
    (counts, prize) => {
      if (prize.total_quantity == null || prize.remaining_quantity == null) return counts;
      if (prize.remaining_quantity <= 0) {
        counts.exhausted += 1;
        counts.campaignId ??= prize.campaign_id;
      } else if (prize.remaining_quantity <= Math.max(1, Math.ceil(prize.total_quantity * 0.2))) {
        counts.low += 1;
        counts.campaignId ??= prize.campaign_id;
      }
      return counts;
    },
    { low: 0, exhausted: 0, campaignId: null as string | null },
  );

  return NextResponse.json({
    emailCount: deliveryResult.count ?? 0,
    emailCampaignId: latestAttentionResult.data?.[0]?.campaign_id ?? null,
    lowStockCount: stockAlerts.low,
    exhaustedStockCount: stockAlerts.exhausted,
    stockCampaignId: stockAlerts.campaignId,
  });
}
