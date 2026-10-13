import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { readAllRows } from "@/lib/paginated-read";
import { isPendingGain, stockState } from "@/lib/metric-rules";

const ATTENTION_STATUSES = ["failed", "bounced", "complained", "suppressed"];

export async function GET() {
  const session = await requireAuthenticatedSession();
  const supabase = getSupabaseAdmin();
  const { data: campaigns, error: campaignError } = await readAllRows((offset,end) => supabase
    .from("campaigns")
    .select("id,is_active", { count: "exact" })
    .eq("merchant_id", session.merchant.id).order("id").range(offset,end));

  if (campaignError) {
    return NextResponse.json({ error: "Lecture des alertes impossible" }, { status: 500 });
  }

  const campaignIds = (campaigns ?? []).map((campaign) => campaign.id);
  const activeIds = new Set((campaigns ?? []).filter(c => c.is_active).map(c => c.id));
  if (!campaignIds.length) {
    return NextResponse.json({
      emailCount: 0,
      emailCampaignId: null,
      lowStockCount: 0,
      exhaustedStockCount: 0,
      stockCampaignId: null,
    });
  }

  const [deliveryResult, prizeResult] = await Promise.all([
    readAllRows((offset,end) => supabase
      .from("reward_email_deliveries")
      .select("id,campaign_id,lead_id,status,updated_at", { count: "exact" })
      .in("campaign_id", campaignIds)
      .eq("support_is_handled", false)
      .in("status", ATTENTION_STATUSES).order("id").range(offset,end)),
    readAllRows((offset,end) => supabase
      .from("prizes")
      .select("campaign_id, total_quantity, remaining_quantity", { count: "exact" })
      .in("campaign_id", campaignIds).order("id").range(offset,end)),
  ]);

  if (deliveryResult.error || prizeResult.error) {
    return NextResponse.json({ error: "Lecture des alertes impossible" }, { status: 500 });
  }

  // Une ligne d’e-mail n’est actionnable que si elle concerne un gain réel
  // encore disponible. Les anciens enregistrements créés pour un participant
  // perdant (prize_id NULL) ne doivent jamais maintenir une alerte permanente.
  const deliveryRows = deliveryResult.data ?? [];
  const leadIds = [...new Set(deliveryRows.map((delivery) => delivery.lead_id))];
  const { data: leadRows, error: leadError } = leadIds.length
    ? await readAllRows((offset,end) => supabase
        .from("leads")
        .select("id,prize_id,status,reward_expires_at", { count: "exact" })
        .in("id", leadIds).order("id").range(offset,end))
    : { data: [], error: null };

  if (leadError) {
    return NextResponse.json({ error: "Lecture des alertes impossible" }, { status: 500 });
  }

  const actionableLeadIds = new Set(
    (leadRows ?? [])
      .filter((lead) => isPendingGain({ prizeId: lead.prize_id, status: lead.status, rewardExpiresAt: lead.reward_expires_at }))
      .map((lead) => lead.id),
  );
  const actionableDeliveries = deliveryRows.filter((delivery) => actionableLeadIds.has(delivery.lead_id));
  const latestAttention = [...actionableDeliveries].sort((a, b) =>
    String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")),
  )[0];

  const stockAlerts = (prizeResult.data ?? []).reduce(
    (counts, prize) => {
      if (!activeIds.has(prize.campaign_id)) return counts;
      const state = stockState(prize.remaining_quantity, prize.total_quantity);
      if (state === "exhausted") {
        counts.exhausted += 1;
        counts.campaignId ??= prize.campaign_id;
      } else if (state === "low") {
        counts.low += 1;
        counts.campaignId ??= prize.campaign_id;
      }
      return counts;
    },
    { low: 0, exhausted: 0, campaignId: null as string | null },
  );

  return NextResponse.json({
    emailCount: actionableDeliveries.length,
    emailCampaignId: latestAttention?.campaign_id ?? null,
    lowStockCount: stockAlerts.low,
    exhaustedStockCount: stockAlerts.exhausted,
    stockCampaignId: stockAlerts.campaignId,
  });
}
