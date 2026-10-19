import { assertSaasAdminEmail } from "@/lib/admin";
import { getAdminCampaignLocations } from "@/lib/admin-campaign-repository";
import { toAdminEstablishmentProfile } from "@/lib/admin-establishment-profile";
import { getSupabaseAdmin } from "@/lib/supabase";
import { GAIN_NOTIFICATION_FREQUENCIES, type GainNotificationFrequency } from "@/lib/merchant-gain-notification-email";

/** The caller must pass the email from the verified server session. */
export async function getAdminEstablishmentProfiles(accountMerchantId: string, adminEmail: string, targetUserId: string) {
  assertSaasAdminEmail(adminEmail);
  const db = getSupabaseAdmin();
  // The account in the URL alone is insufficient: preferences are personal.
  const user = await db.from("merchant_users").select("id")
    .eq("merchant_id", accountMerchantId).eq("id", targetUserId).maybeSingle();
  if (user.error) throw new Error("Lecture du compte impossible.");
  if (!user.data) return [];
  const locations = await getAdminCampaignLocations(accountMerchantId, targetUserId);
  if (!locations.length) return [];
  const preferences = await db.from("merchant_gain_notification_preferences")
    .select("merchant_id,enabled_frequencies,updated_at")
    .eq("user_id", targetUserId).in("merchant_id", locations.map(({ id }) => id));
  if (preferences.error) throw new Error("Lecture des préférences de notification impossible.");
  const byLocation = new Map<string, { frequencies: GainNotificationFrequency[]; updatedAt: string | null }>();
  for (const row of preferences.data ?? []) {
    if (!Array.isArray(row.enabled_frequencies) || row.enabled_frequencies.some((frequency: string) =>
      !GAIN_NOTIFICATION_FREQUENCIES.includes(frequency as GainNotificationFrequency))) {
      throw new Error("Préférence de notification invalide.");
    }
    byLocation.set(row.merchant_id, { frequencies: row.enabled_frequencies as GainNotificationFrequency[], updatedAt: row.updated_at });
  }
  return locations.map(location => toAdminEstablishmentProfile(location,
    byLocation.get(location.id) ?? { frequencies: [], updatedAt: null }));
}
