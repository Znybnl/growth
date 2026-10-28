import { getSupabaseAdmin } from "@/lib/supabase";
import { readAllRows } from "@/lib/paginated-read";
import { deduplicateReusablePrizes, type ReusablePrize } from "@/lib/reusable-prizes";

type ReuseSettings = { reusedFromPrizeId?: string; reusedAt?: string };

/** Dates become durable only with the atomic campaign save. Never trust a client date. */
export async function preparePrizeReuseSettings(
  merchantId: string, campaignId: string,
  prizes: Array<{ id: string; reusedFromPrizeId?: string }>,
  previous: Record<string, ReuseSettings> = {},
): Promise<Record<string, ReuseSettings>> {
  const result: Record<string, ReuseSettings> = {};
  const requested = prizes.filter((prize) => prize.reusedFromPrizeId && !previous[prize.id]?.reusedAt);
  if (requested.length) {
    const sources = await getSupabaseAdmin().from("prizes")
      .select("id,campaign_id,campaigns!inner(merchant_id)")
      .eq("campaigns.merchant_id", merchantId).neq("campaign_id", campaignId)
      .in("id", [...new Set(requested.map((prize) => prize.reusedFromPrizeId!))]);
    if (sources.error) throw new Error("Vérification des lots réutilisés impossible.");
    const allowed = new Set((sources.data ?? []).filter((row) =>
      (row.campaigns as unknown as { merchant_id: string })?.merchant_id === merchantId && row.campaign_id !== campaignId,
    ).map((row) => row.id));
    if (requested.some((prize) => !allowed.has(prize.reusedFromPrizeId))) {
      throw new Error("Un lot à réutiliser n’est plus disponible dans cet établissement.");
    }
  }
  const now = new Date().toISOString();
  for (const prize of prizes) {
    const saved = previous[prize.id];
    if (saved?.reusedFromPrizeId && saved.reusedAt) {
      result[prize.id] = { reusedFromPrizeId: saved.reusedFromPrizeId, reusedAt: saved.reusedAt };
    } else if (prize.reusedFromPrizeId) {
      result[prize.id] = { reusedFromPrizeId: prize.reusedFromPrizeId, reusedAt: now };
    }
  }
  return result;
}

type Row = {
  id: string; campaign_id: string; label: string; probability: number | string;
  estimated_unit_cost: number | string; total_quantity: number | null; purchase_required: boolean;
  created_at: string;
  campaigns: { id: string; merchant_id: string; title: string; created_at: string;
    prize_settings: Record<string, { usageConditions?: string; estimatedUnitCostKnown?: boolean } & ReuseSettings> | null };
};

/** Private DAL: caller must resolve the active/authorized establishment first.
 * Filter at the joined campaign before pagination, then project an explicit DTO.
 * No remaining stock, participants, media or complete campaign JSON is returned. */
export async function getReusablePrizes(merchantId: string, excludeCampaignId?: string): Promise<ReusablePrize[]> {
  const result = await readAllRows<Row>((offset, end) => {
    const query = getSupabaseAdmin().from("prizes")
      .select("id,campaign_id,label,probability,estimated_unit_cost,total_quantity,purchase_required,created_at,campaigns!inner(id,merchant_id,title,created_at,prize_settings:campaign_local_settings->prizeSettings)", { count: "exact" })
      .eq("campaigns.merchant_id", merchantId);
    return query.order("id").range(offset, end).returns<Row[]>();
  });
  if (result.error) throw new Error("Lecture des lots précédents impossible.");
  // The current game's saved reuse counts, although its prizes cannot be offered.
  const lastReuse = new Map<string, string>();
  for (const row of result.data ?? []) {
    if (row.campaigns?.merchant_id !== merchantId) continue;
    const reuse = row.campaigns.prize_settings?.[row.id];
    if (!reuse?.reusedFromPrizeId || !reuse.reusedAt || !Number.isFinite(Date.parse(reuse.reusedAt))) continue;
    const date = new Date(reuse.reusedAt).toISOString();
    for (const id of [row.id, reuse.reusedFromPrizeId]) {
      if (!lastReuse.has(id) || date > lastReuse.get(id)!) lastReuse.set(id, date);
    }
  }
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
      lastUsedAt: lastReuse.get(row.id) ?? row.created_at ?? row.campaigns.created_at,
      label: row.label, probability, estimatedUnitCost: cost, totalQuantity: row.total_quantity,
      purchaseRequired: Boolean(row.purchase_required), usageConditions: typeof condition === "string" ? condition : "",
      estimatedUnitCostKnown: row.campaigns.prize_settings?.[row.id]?.estimatedUnitCostKnown === false ? false : undefined,
    });
  }
  return deduplicateReusablePrizes(prizes);
}
