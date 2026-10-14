import { getSupabaseAdmin } from "@/lib/supabase";
import { measureServerStage } from "@/lib/server-performance";
import type { MerchantAlerts } from "@/lib/merchant-alerts";

export async function getMerchantOperationalAlerts(merchantId: string): Promise<MerchantAlerts> {
  return measureServerStage("data.alerts", async () => {
    const { data, error } = await getSupabaseAdmin().rpc("get_merchant_operational_alerts", {
      p_merchant_id: merchantId,
    });
    const row = data?.[0];
    if (error || !row) throw new Error("Lecture des alertes impossible");
    return {
      emailCount: Number(row.email_count), emailCampaignId: row.email_campaign_id,
      lowStockCount: Number(row.low_stock_count), exhaustedStockCount: Number(row.exhausted_stock_count),
      stockCampaignId: row.stock_campaign_id,
    };
  });
}
