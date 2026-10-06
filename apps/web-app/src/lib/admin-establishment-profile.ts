import type { Merchant } from "@/lib/types";
import type { GainNotificationFrequency } from "@/lib/merchant-gain-notification-email";

/** Explicit public-to-admin DTO. Never serialize/spread the full Merchant. */
export function toAdminEstablishmentProfile(merchant: Merchant, gainNotification?: {
  frequency: GainNotificationFrequency; updatedAt: string | null;
}) {
  return {
    id: merchant.id,
    companyName: merchant.companyName,
    logoText: merchant.logoText,
    logoUrl: merchant.logoUrl,
    locationCode: merchant.locationCode,
    industry: merchant.industry,
    industrySubsector: merchant.industrySubsector,
    restaurantType: merchant.restaurantType,
    city: merchant.city,
    address: merchant.address,
    contactName: merchant.contactName,
    phone: merchant.phone,
    restaurantEmail: merchant.restaurantEmail,
    websiteUrl: merchant.websiteUrl,
    appointmentUrl: merchant.appointmentUrl,
    googleReviewUrl: merchant.googleReviewUrl,
    googlePlaceName: merchant.googlePlaceName,
    googlePlaceAddress: merchant.googlePlaceAddress,
    googlePlaceRating: merchant.googlePlaceRating,
    googlePlaceReviewCount: merchant.googlePlaceReviewCount,
    instagramUrl: merchant.instagramUrl,
    facebookUrl: merchant.facebookUrl,
    tiktokUrl: merchant.tiktokUrl,
    tripadvisorUrl: merchant.tripadvisorUrl,
    customLinkUrl: merchant.customLinkUrl,
    timeZone: merchant.timeZone,
    preferredGoals: merchant.preferredGoals,
    diffusionSupport: merchant.diffusionSupport,
    defaultPrizeCost: merchant.defaultPrizeCost,
    onboardingCompleted: merchant.onboardingCompleted,
    redemptionPinConfigured: merchant.redemptionPinConfigured,
    createdAt: merchant.createdAt,
    gainNotification: gainNotification ? {
      frequency: gainNotification.frequency,
      updatedAt: gainNotification.updatedAt,
    } : undefined,
  };
}

export type AdminEstablishmentProfile = ReturnType<typeof toAdminEstablishmentProfile>;

/** Stored URLs are untrusted, including old/imported account profiles. */
export function getSafeProfileUrl(value?: string) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}
