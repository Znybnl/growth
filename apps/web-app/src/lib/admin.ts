const SAAS_ADMIN_EMAILS = new Set([
  "pierreh.brunelle@krys-group.com",
  "pierreh.brunelle@gmail.com",
]);

export function isSaasAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  return SAAS_ADMIN_EMAILS.has(email.trim().toLowerCase());
}

export function assertSaasAdminEmail(email?: string | null) {
  if (!isSaasAdminEmail(email)) {
    throw new Error("Accès réservé à l'administration.");
  }
}
