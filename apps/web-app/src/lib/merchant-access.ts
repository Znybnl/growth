import { MerchantWorkspaceRole } from "@/lib/types";

export function canAccessMerchantRole(
  role: MerchantWorkspaceRole | undefined,
  allowed: MerchantWorkspaceRole[],
) {
  // Legacy single-site accounts predate memberships and remain owners.
  return !role || allowed.includes(role);
}

export function assertMerchantRole(
  role: MerchantWorkspaceRole | undefined,
  allowed: MerchantWorkspaceRole[],
) {
  if (!canAccessMerchantRole(role, allowed)) {
    throw new Error("Votre rôle ne permet pas cette action.");
  }
}
