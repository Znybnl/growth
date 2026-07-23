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

  const [deliveryResult, prizeResult] = await Promise.all([
    supabase
      .from("reward_email_deliveries")
      .select("id,campaign_id,lead_id,status,updated_at")
      .in("campaign_id", campaignIds)
      .in("status", ATTENTION_STATUSES),
    supabase
      .from("prizes")
      .select("campaign_id, total_quantity, remaining_quantity")
      .in("campaign_id", campaignIds),
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
    ? await supabase
        .from("leads")
        .select("id,prize_id,status")
        .in("id", leadIds)
    : { data: [], error: null };

  if (leadError) {
    return NextResponse.json({ error: "Lecture des alertes impossible" }, { status: 500 });
  }

  const actionableLeadIds = new Set(
    (leadRows ?? [])
      .filter((lead) => Boolean(lead.prize_id) && lead.status === "claimed")
      .map((lead) => lead.id),
  );
  const actionableDeliveries = deliveryRows.filter((delivery) => actionableLeadIds.has(delivery.lead_id));
  const latestAttention = [...actionableDeliveries].sort((a, b) =>
    String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")),
  )[0];

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
    emailCount: actionableDeliveries.length,
    emailCampaignId: latestAttention?.campaign_id ?? null,
    lowStockCount: stockAlerts.low,
    exhaustedStockCount: stockAlerts.exhausted,
    stockCampaignId: stockAlerts.campaignId,
  });
}

