/** Default text mark for a merchant follows the full, user-facing business name. */
export function defaultMerchantLogoText(companyName: string): string {
  return companyName.trim();
}

/** Replace the legacy two-letter default while retaining a merchant's custom text. */
export function resolveMerchantLogoText(companyName: string, storedText?: string): string {
  const fullName = defaultMerchantLogoText(companyName);
  const text = storedText?.trim();
  if (!text) return fullName;

  const legacyInitials = fullName.slice(0, 2).toUpperCase();
  return text === legacyInitials ? fullName : text;
}
