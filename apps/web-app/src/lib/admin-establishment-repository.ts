import { assertSaasAdminEmail } from "@/lib/admin";
import { getAdminCampaignLocations } from "@/lib/admin-campaign-repository";
import { toAdminEstablishmentProfile } from "@/lib/admin-establishment-profile";

/** The caller must pass the email from the verified server session. */
export async function getAdminEstablishmentProfiles(accountMerchantId: string, adminEmail: string) {
  assertSaasAdminEmail(adminEmail);
  const locations = await getAdminCampaignLocations(accountMerchantId);
  return locations.map(toAdminEstablishmentProfile);
}
