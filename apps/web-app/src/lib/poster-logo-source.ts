export function resolvePosterLogoSource(
  logoMode: string | undefined,
  logoDataSource: string | undefined,
  posterLogoUrl: string | undefined,
  campaignLogoUrl: string | undefined,
) {
  if (logoMode !== "image") return undefined;
  return logoDataSource || posterLogoUrl || campaignLogoUrl;
}
