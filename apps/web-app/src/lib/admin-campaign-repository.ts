import { getSupabaseMerchantProfile, getSupabaseMerchantWorkspaceContext } from "@/lib/merchant-account-repository";
import { isAdminCampaignLocationAllowed } from "@/lib/admin-campaign-access";
import { assertSaasAdminEmail } from "@/lib/admin";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { Merchant } from "@/lib/types";

export type AdminCampaign = {
  id: string;
  title: string;
  isActive: boolean;
  createdAt: string;
  merchantName: string;
  accountMerchantId: string;
  locationId: string;
};

export type AdminCampaignContext = {
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
  if (accountMerchantId === targetLocationId) {
    const location = await getSupabaseMerchantProfile(targetLocationId);
    return location?.locationStatus !== "archived" ? location : null;
  }
  const locations = await getAdminCampaignLocations(accountMerchantId);
  if (!isAdminCampaignLocationAllowed(accountMerchantId, targetLocationId, locations.map(({ id }) => id))) {
    return null;
  }
  return locations.find(({ id }) => id === targetLocationId) ?? null;
}

/** Only call with the email from a verified server session, never from request input. */
export async function getAdminCampaignContext(
  campaignId: string,
  adminEmail: string,
  accountMerchantId?: string,
): Promise<AdminCampaignContext | null> {
  assertSaasAdminEmail(adminEmail);
  if (!isSupabaseConfigured()) {
    throw new Error("La base de données n’est pas configurée.");
  }

  const supabase = getSupabaseAdmin();
  const result = await supabase
    .from("campaigns")
    .select("merchant_id")
    .eq("id", campaignId)
    .maybeSingle<{
      merchant_id: string;
    }>();

  if (result.error) throw new Error("Vérification du jeu impossible.");
  if (!result.data) return null;

  const resolvedAccountId = accountMerchantId ?? result.data.merchant_id;
  const location = await getAdminCampaignLocation(resolvedAccountId, result.data.merchant_id);
  if (!location) return null;

  return {
    accountMerchantId: resolvedAccountId,
    targetLocationId: result.data.merchant_id,
    location,
  };
}

export const ADMIN_CAMPAIGNS_PAGE_SIZE = 50;

export async function getAdminCampaigns(
  adminEmail: string,
  options: { accountMerchantId?: string; query?: string; page?: number } = {},
): Promise<{ campaigns: AdminCampaign[]; hasNextPage: boolean; page: number }> {
  assertSaasAdminEmail(adminEmail);
  if (!isSupabaseConfigured()) {
    throw new Error("La base de données n’est pas configurée.");
  }

  const supabase = getSupabaseAdmin();
  const requestedPage = options.page ?? 1;
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
    ? Math.min(requestedPage, 100_000) : 1;
  const offset = (page - 1) * ADMIN_CAMPAIGNS_PAGE_SIZE;
  let request = supabase
    .from("campaigns")
    .select("id,merchant_id,title,is_active,created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (options.accountMerchantId) {
    const locations = await getAdminCampaignLocations(options.accountMerchantId);
    if (!locations.length) return { campaigns: [], hasNextPage: false, page };
    request = request.in("merchant_id", locations.map(({ id }) => id));
  }
  const query = options.query?.trim();
  if (query) request = request.ilike("title", `%${query.replace(/[\\%_]/g, "\\$&")}%`);
  // One extra row detects the next page, without downloading all campaign settings/assets.
  const result = await request.range(offset, offset + ADMIN_CAMPAIGNS_PAGE_SIZE);

  if (result.error) throw new Error("Lecture des jeux des marchands impossible.");
  const hasNextPage = (result.data?.length ?? 0) > ADMIN_CAMPAIGNS_PAGE_SIZE;
  const rows = (result.data ?? []).slice(0, ADMIN_CAMPAIGNS_PAGE_SIZE);
  if (!rows.length) return { campaigns: [], hasNextPage: false, page };

  const locationIds = [...new Set(rows.map(({ merchant_id }) => merchant_id))];
  const merchantsResult = await supabase
    .from("merchants")
    .select("id,company_name")
    .in("id", locationIds);

  if (merchantsResult.error) throw new Error("Lecture des noms d’établissement impossible.");

  const merchantNames = new Map(
    (merchantsResult.data ?? []).map((merchant) => [merchant.id, merchant.company_name]),
  );
  const campaigns = rows.map((row) => ({
    id: row.id,
    title: row.title,
    isActive: row.is_active,
    createdAt: row.created_at,
    merchantName: merchantNames.get(row.merchant_id) ?? "Établissement introuvable",
    accountMerchantId: options.accountMerchantId ?? row.merchant_id,
    locationId: row.merchant_id,
  } satisfies AdminCampaign));
  return { campaigns, hasNextPage, page };
}
