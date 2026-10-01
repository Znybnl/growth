import type { MerchantImageKind } from "@/lib/merchant-image-processing";

export const MAX_MERCHANT_IMAGE_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MERCHANT_IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";

export function isMerchantOptimizedImageUrl(value: string | undefined | null) {
  if (!value) return false;
  try {
    return new URL(value).pathname.includes("/storage/v1/object/public/merchant-images/");
  } catch {
    return false;
  }
}

export function getMerchantOptimizedImageDimensions(value: string | undefined | null) {
  if (!value) return null;
  try {
    const match = new URL(value).pathname.match(/\/merchant-images\/[a-zA-Z0-9_-]+\/[0-9a-f-]{36}_(\d{1,5})x(\d{1,5})\.webp$/i);
    if (!match) return null;
    return { width: Number(match[1]), height: Number(match[2]) };
  } catch {
    return null;
  }
}

export async function uploadMerchantImageFile(
  file: File,
  kind: MerchantImageKind,
  adminTarget?: { accountMerchantId: string; locationId: string },
) {
  if (file.type && !new Set(["image/png", "image/jpeg", "image/webp"]).has(file.type)) {
    throw new Error("Format non pris en charge. Utilisez un PNG, JPEG ou WebP.");
  }
  if (file.size === 0 || file.size > MAX_MERCHANT_IMAGE_UPLOAD_BYTES) {
    throw new Error("Image trop volumineuse. Importez une image de 4 Mo maximum.");
  }

  const body = new FormData();
  body.set("file", file);
  body.set("kind", kind);
  if (adminTarget) {
    body.set("accountMerchantId", adminTarget.accountMerchantId);
    body.set("locationId", adminTarget.locationId);
  }
  const response = await fetch("/api/merchant/images", {
    method: "POST",
    body,
    credentials: "same-origin",
  });
  const payload = await response.json().catch(() => null) as {
    error?: string;
    image?: { url: string; width: number; height: number; bytes: number };
  } | null;

  if (!response.ok || !payload?.image?.url) {
    throw new Error(payload?.error ?? "L’image n’a pas pu être optimisée. Réessayez avec un autre fichier.");
  }

  return payload.image;
}
