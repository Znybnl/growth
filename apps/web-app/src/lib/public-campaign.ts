import type { CampaignPresentation, PublicCampaignPresentation } from "@/lib/types";

/** Excludes poster-only artwork from the payload used by public game pages. */
export function toPublicCampaignPresentation(
  presentation: CampaignPresentation,
): PublicCampaignPresentation {
  const { poster: _poster, ...publicPresentation } = presentation;
  void _poster;
  return publicPresentation;
}
