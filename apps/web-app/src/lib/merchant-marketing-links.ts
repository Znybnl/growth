import { getAuthenticatedSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { isSaasAdminEmail } from "@/lib/admin";
import { getAdminCampaignLocation } from "@/lib/admin-campaign-repository";
import { getSupabaseAdmin } from "@/lib/supabase";
import { assertTrustedMutationRequest } from "@/lib/request-security";
import { logSupportEvent } from "@/lib/support-log";
import { marketingActionEntry, normalizeMarketingActionUrl, type MarketingActionKey } from "@/lib/marketing-action-library";

const columns = {
  google: "google_review_url", instagram: "instagram_url", facebook: "facebook_url",
  tiktok: "tiktok_url", tripadvisor: "tripadvisor_url", appointment: "appointment_url",
  website: "website_url", custom: "custom_link_url",
} as const;
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

/** Updates one existing Mon compte field. Never rewrites the account, user, campaigns or PIN. */
export async function updateMerchantMarketingLink(locationId: string, key: MarketingActionKey, url: string) {
  const result = await getSupabaseAdmin().from("merchants")
    .update({ [columns[key]]: url }).eq("id", locationId).neq("location_status", "archived")
    .select("id").maybeSingle();
  if (result.error || !result.data) throw new Error("Enregistrement du lien impossible. Réessayez.");
}

export async function handleMarketingLinkUpdate(request: Request, adminTarget?: { merchantId: string; locationId: string }) {
  try { assertTrustedMutationRequest(request); }
  catch { return Response.json({ error: "Origine de requête non autorisée." }, { status: 403, headers }); }
  try {
    const session = await getAuthenticatedSession();
    if (!session) return Response.json({ error: "Authentification requise." }, { status: 401, headers });
    if (adminTarget && !isSaasAdminEmail(session.user.email))
      return Response.json({ error: "Accès réservé à l’administration." }, { status: 403, headers });
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).some(key => !["key", "url", ...(adminTarget ? [] : ["locationId"])].includes(key)) ||
      typeof body.key !== "string" || typeof body.url !== "string")
      return Response.json({ error: "Configuration du lien invalide." }, { status: 400, headers });
    let key: MarketingActionKey;
    let url: string;
    try { key = marketingActionEntry(body.key).key; url = normalizeMarketingActionUrl(key, body.url); }
    catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Lien invalide." }, { status: 400, headers }); }
    const locationId = adminTarget?.locationId ?? body.locationId;
    if (typeof locationId !== "string" || !locationId || locationId.length > 120)
      return Response.json({ error: "Établissement requis." }, { status: 400, headers });
    const location = adminTarget
      ? await getAdminCampaignLocation(adminTarget.merchantId, locationId)
      : session.locations.find(({ merchant }) => merchant.id === locationId)?.merchant;
    if (!location || location.locationStatus === "archived")
      return Response.json({ error: "Accès à cet établissement refusé." }, { status: 403, headers });
    await updateMerchantMarketingLink(locationId, key, url);
    try { revalidatePath("/account"); }
    catch { logSupportEvent("warn", "marketing_link_cache_refresh_failed", { merchantId: locationId }); }
    logSupportEvent("info", "marketing_link_updated", {
      merchantId: locationId, actionKey: key, actorUserId: session.user.id, adminAssistance: Boolean(adminTarget),
    });
    return Response.json({ key, url }, { headers });
  } catch {
    // No raw URL, session, personal data or database error in diagnostics.
    logSupportEvent("error", "marketing_link_update_failed", {});
    return Response.json({ error: "Enregistrement du lien impossible. Réessayez." }, { status: 503, headers });
  }
}
