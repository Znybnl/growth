import { getSupabaseAdmin } from "@/lib/supabase";
import { readAllRows } from "@/lib/paginated-read";
import { deduplicateReusablePrizes, type ReusablePrize } from "@/lib/reusable-prizes";

type Row = {
  id: string; campaign_id: string; label: string; probability: number | string;
  estimated_unit_cost: number | string; total_quantity: number | null; purchase_required: boolean;
  created_at: string;
  campaigns: { id: string; merchant_id: string; title: string; created_at: string;
    prize_settings: Record<string, { usageConditions?: string }> | null };
};

/** Private DAL: caller must resolve the active/authorized establishment first.
 * Filter at the joined campaign before pagination, then project an explicit DTO.
 * No remaining stock, participants, media or complete campaign JSON is returned. */
export async function getReusablePrizes(merchantId: string, excludeCampaignId?: string): Promise<ReusablePrize[]> {
  const result = await readAllRows<Row>((offset, end) => {
    let query = getSupabaseAdmin().from("prizes")
      .select("id,campaign_id,label,probability,estimated_unit_cost,total_quantity,purchase_required,created_at,campaigns!inner(id,merchant_id,title,created_at,prize_settings:campaign_local_settings->prizeSettings)", { count: "exact" })
      .eq("campaigns.merchant_id", merchantId);
    if (excludeCampaignId) query = query.neq("campaign_id", excludeCampaignId);
    return query.order("id").range(offset, end).returns<Row[]>();
  });
  if (result.error) throw new Error("Lecture des lots précédents impossible.");
  const prizes: ReusablePrize[] = [];
  for (const row of result.data ?? []) {
    // Defense in depth even if a future query modification drops a filter.
    if (row.campaigns?.merchant_id !== merchantId || row.campaign_id === excludeCampaignId) continue;
    const probability = Number(row.probability);
    const cost = Number(row.estimated_unit_cost);
    if (!row.label.trim() || /^perdu\s*!?$/i.test(row.label.trim()) || !Number.isFinite(probability)
      || probability < 0 || probability > 100 || row.estimated_unit_cost == null || !Number.isFinite(cost) || cost < 0
      || (row.total_quantity !== null && (!Number.isSafeInteger(row.total_quantity) || row.total_quantity <= 0))) continue;
    const condition = row.campaigns.prize_settings?.[row.id]?.usageConditions;
    prizes.push({
      id: row.id, sourceCampaignId: row.campaign_id, sourceCampaignTitle: row.campaigns.title,
      lastUsedAt: row.created_at || row.campaigns.created_at,
      label: row.label, probability, estimatedUnitCost: cost, totalQuantity: row.total_quantity,
      purchaseRequired: Boolean(row.purchase_required), usageConditions: typeof condition === "string" ? condition : "",
    });
  }
  return deduplicateReusablePrizes(prizes);
}
