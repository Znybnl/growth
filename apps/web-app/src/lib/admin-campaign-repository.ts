import { getSupabaseMerchantProfile, getSupabaseMerchantWorkspaceContext } from "@/lib/merchant-account-repository";
import { isAdminCampaignLocationAllowed } from "@/lib/admin-campaign-access";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { Merchant } from "@/lib/types";

export async function getAdminCampaignLocations(accountMerchantId: string): Promise<Merchant[]> {
  if (!isSupabaseConfigured()) {
    throw new Error("La base de données n’est pas configurée.");
  }

  const account = await getSupabaseMerchantProfile(accountMerchantId);
  if (!account) return [];

  const supabase = getSupabaseAdmin();
  const usersResult = await supabase
    .from("merchant_users")
    .select("id")
    .eq("merchant_id", accountMerchantId)
    .order("created_at", { ascending: true })
    .limit(50);

  if (usersResult.error) throw new Error("Lecture des établissements du compte impossible.");

  const contexts = await Promise.all(
    (usersResult.data ?? []).map(({ id }) => getSupabaseMerchantWorkspaceContext(id, account)),
  );
  const locationsById = new Map<string, Merchant>([[account.id, account]]);
  for (const context of contexts) {
    for (const { merchant } of context.locations) {
      if (merchant.locationStatus !== "archived") locationsById.set(merchant.id, merchant);
    }
  }

  return [...locationsById.values()].filter((merchant) => merchant.locationStatus !== "archived");
}

export async function getAdminCampaignLocation(
  accountMerchantId: string,
  targetLocationId: string,
) {
  const locations = await getAdminCampaignLocations(accountMerchantId);
  if (!isAdminCampaignLocationAllowed(accountMerchantId, targetLocationId, locations.map(({ id }) => id))) {
    return null;
  }
  return locations.find(({ id }) => id === targetLocationId) ?? null;
}
