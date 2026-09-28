import { getSupabaseMerchantProfile, getSupabaseMerchantWorkspaceContext } from "@/lib/merchant-account-repository";
import {
  isAdminCampaignLocationAllowed,
  isAdminCreatedCampaignAccessible,
} from "@/lib/admin-campaign-access";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { Merchant } from "@/lib/types";

export type AdminCreatedCampaign = {
  id: string;
  title: string;
  isActive: boolean;
  createdAt: string;
  merchantName: string;
  accountMerchantName: string;
  accountMerchantId: string;
  locationId: string;
};

type AdminCampaignSettings = {
  adminCreation?: {
    adminUserId?: unknown;
    accountMerchantId?: unknown;
    targetLocationId?: unknown;
  };
};

export type AdminCreatedCampaignContext = {
  accountMerchantId: string;
  targetLocationId: string;
  location: Merchant;
};

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

export async function getAdminCreatedCampaignContext(
  campaignId: string,
  adminUserId: string,
): Promise<AdminCreatedCampaignContext | null> {
  if (!isSupabaseConfigured()) {
    throw new Error("La base de données n’est pas configurée.");
  }

  const supabase = getSupabaseAdmin();
  const result = await supabase
    .from("campaigns")
    .select("merchant_id,campaign_local_settings")
    .eq("id", campaignId)
    .maybeSingle<{
      merchant_id: string;
      campaign_local_settings: AdminCampaignSettings | null;
    }>();

  if (result.error) throw new Error("Vérification du jeu créé par l’administration impossible.");
  if (!result.data) return null;

  const audit = result.data.campaign_local_settings?.adminCreation;
  if (!isAdminCreatedCampaignAccessible(result.data.merchant_id, adminUserId, audit)) return null;

  const accountMerchantId = audit?.accountMerchantId;
  if (typeof accountMerchantId !== "string") return null;

  const location = await getAdminCampaignLocation(accountMerchantId, result.data.merchant_id);
  if (!location) return null;

  return {
    accountMerchantId,
    targetLocationId: result.data.merchant_id,
    location,
  };
}

export async function getAdminCreatedCampaigns(
  adminUserId: string,
  query = "",
): Promise<AdminCreatedCampaign[]> {
  if (!isSupabaseConfigured()) {
    throw new Error("La base de données n’est pas configurée.");
  }

  const supabase = getSupabaseAdmin();
  const result = await supabase
    .from("campaigns")
    .select("id,merchant_id,title,is_active,created_at,campaign_local_settings")
    .contains("campaign_local_settings", { adminCreation: { adminUserId } })
    .order("created_at", { ascending: false })
    .limit(500);

  if (result.error) throw new Error("Lecture des jeux créés par l’administration impossible.");

  const rows = (result.data ?? []).filter((row) =>
    isAdminCreatedCampaignAccessible(
      row.merchant_id,
      adminUserId,
      (row.campaign_local_settings as AdminCampaignSettings | null)?.adminCreation,
    ),
  );
  if (!rows.length) return [];

  const locationIds = [...new Set(rows.map(({ merchant_id }) => merchant_id))];
  const accountIds = [...new Set(rows.flatMap(({ campaign_local_settings }) => {
    const audit = (campaign_local_settings as AdminCampaignSettings | null)?.adminCreation;
    return typeof audit?.accountMerchantId === "string" ? [audit.accountMerchantId] : [];
  }))];
  const merchantIds = [...new Set([...locationIds, ...accountIds])];
  const merchantsResult = await supabase
    .from("merchants")
    .select("id,company_name")
    .in("id", merchantIds);

  if (merchantsResult.error) throw new Error("Lecture des noms d’établissement impossible.");

  const merchantNames = new Map(
    (merchantsResult.data ?? []).map((merchant) => [merchant.id, merchant.company_name]),
  );
  const normalizedQuery = query.trim().toLocaleLowerCase("fr");

  return rows.flatMap((row) => {
    const audit = (row.campaign_local_settings as AdminCampaignSettings | null)?.adminCreation;
    const accountMerchantId = audit?.accountMerchantId;
    if (typeof accountMerchantId !== "string") return [];

    const campaign = {
      id: row.id,
      title: row.title,
      isActive: row.is_active,
      createdAt: row.created_at,
      merchantName: merchantNames.get(row.merchant_id) ?? "Établissement introuvable",
      accountMerchantName: merchantNames.get(accountMerchantId) ?? "Compte marchand introuvable",
      accountMerchantId,
      locationId: row.merchant_id,
    } satisfies AdminCreatedCampaign;
    const haystack = `${campaign.title} ${campaign.merchantName} ${campaign.accountMerchantName}`
      .toLocaleLowerCase("fr");
    return !normalizedQuery || haystack.includes(normalizedQuery) ? [campaign] : [];
  });
}
