import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CampaignWizard } from "@/components/merchant/campaign-wizard";
import { isSaasAdminEmail } from "@/lib/admin";
import { getAdminCampaignLocations } from "@/lib/admin-campaign-repository";
import { getAuthenticatedSession } from "@/lib/auth";
import type { Merchant } from "@/lib/types";

type AdminCreateCampaignPageProps = {
  searchParams: Promise<{ merchantId?: string; locationId?: string }>;
};

function toAdminWizardMerchant(merchant: Merchant): Merchant {
  return {
    id: merchant.id,
    createdAt: merchant.createdAt,
    companyName: merchant.companyName,
    logoText: merchant.logoText,
    logoUrl: merchant.logoUrl,
    industry: merchant.industry,
    industrySubsector: merchant.industrySubsector,
    websiteUrl: merchant.websiteUrl,
    restaurantEmail: merchant.restaurantEmail,
    appointmentUrl: merchant.appointmentUrl,
    googleReviewUrl: merchant.googleReviewUrl,
    instagramUrl: merchant.instagramUrl,
    facebookUrl: merchant.facebookUrl,
    tiktokUrl: merchant.tiktokUrl,
    tripadvisorUrl: merchant.tripadvisorUrl,
    customLinkUrl: merchant.customLinkUrl,
    defaultPrizeCost: merchant.defaultPrizeCost,
  };
}

export default async function AdminCreateCampaignPage({ searchParams }: AdminCreateCampaignPageProps) {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/connexion");
  if (!isSaasAdminEmail(session.user.email)) redirect("/");

  const { merchantId, locationId } = await searchParams;
  if (!merchantId) {
    return (
      <section className="okado-card max-w-2xl p-6">
        <p className="okado-label">Administration · création assistée</p>
        <h1 className="okado-section-title mt-2">Choisir un compte marchand</h1>
        <p className="mt-2 text-sm text-ash">Ouvrez cette action depuis la ligne du marchand dans Pilotage.</p>
        <Link href="/admin" className="okado-secondary-action mt-5 px-4 text-sm">Retour au pilotage</Link>
      </section>
    );
  }

  const locations = await getAdminCampaignLocations(merchantId);
  if (!locations.length) notFound();

  if (locationId && !locations.some(({ id }) => id === locationId)) notFound();
  const selectedLocation = locations.find(({ id }) => id === locationId) ?? locations[0];
  const wizardMerchant = toAdminWizardMerchant(selectedLocation);
  const saveEndpoint = `/api/admin/merchants/${encodeURIComponent(merchantId)}/locations/${encodeURIComponent(selectedLocation.id)}/campaigns/setup`;

  return (
    <div className="space-y-5">
      <section className="okado-card flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="okado-label">Administration · création assistée</p>
          <h1 className="okado-section-title mt-2">Créer un jeu pour un marchand</h1>
          <p className="mt-2 text-sm text-ash">Le jeu sera enregistré en brouillon et rattaché à l’établissement choisi.</p>
        </div>
        <form action="/admin/campaigns/new" method="get" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="merchantId" value={merchantId} />
          <label className="min-w-64 text-sm font-medium text-carbon">
            Établissement
            <select name="locationId" defaultValue={selectedLocation.id} className="mt-1 block h-11 w-full rounded-[10px] border border-fog bg-white px-3">
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.companyName}{location.city ? ` · ${location.city}` : ""}
                </option>
              ))}
            </select>
          </label>
          {locations.length > 1 ? <button type="submit" className="okado-secondary-action h-11 px-4 text-sm">Choisir ce site</button> : null}
        </form>
      </section>
      <CampaignWizard key={selectedLocation.id} merchant={wizardMerchant} adminSaveEndpoint={saveEndpoint} />
    </div>
  );
}
