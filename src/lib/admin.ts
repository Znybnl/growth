const SAAS_ADMIN_EMAILS = new Set(["pierreh.brunelle@krys-group.com"]);

export function isSaasAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  return SAAS_ADMIN_EMAILS.has(email.trim().toLowerCase());
}
