import sharp, { type Metadata } from "sharp";
import {
  MAX_MERCHANT_IMAGE_PIXELS,
  MAX_MERCHANT_IMAGE_SIDE_PX,
  MAX_MERCHANT_IMAGE_SOURCE_BYTES,
} from "@/lib/merchant-image-constants";

export { MAX_MERCHANT_IMAGE_SOURCE_BYTES, MAX_MERCHANT_IMAGE_PIXELS, MAX_MERCHANT_IMAGE_SIDE_PX };

export type MerchantImageKind = "logo" | "background";

export type OptimizedMerchantImage = {
  buffer: Buffer;
  height: number;
  width: number;
};

const IMAGE_POLICIES = {
  logo: {
    maxBytes: 500 * 1024,
    maxDimension: 800,
    minLongestSide: 320,
    initialQuality: 85,
  },
  background: {
    maxBytes: 1024 * 1024,
    maxDimension: 2560,
    minLongestSide: 1280,
    initialQuality: 80,
  },
} satisfies Record<MerchantImageKind, {
  maxBytes: number;
  maxDimension: number;
  minLongestSide: number;
  initialQuality: number;
}>;

export class MerchantImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MerchantImageValidationError";
  }
}

export async function optimizeMerchantImage(
  source: Buffer,
  kind: MerchantImageKind,
): Promise<OptimizedMerchantImage> {
  if (source.byteLength === 0 || source.byteLength > MAX_MERCHANT_IMAGE_SOURCE_BYTES) {
    throw new MerchantImageValidationError("L’image doit peser 4 Mo maximum.");
  }

  let metadata: Metadata;
  try {
    metadata = await sharp(source, {
      failOn: "warning",
      limitInputPixels: MAX_MERCHANT_IMAGE_PIXELS,
      pages: 1,
    }).metadata();
  } catch {
    throw new MerchantImageValidationError("Le fichier n’est pas une image valide ou ne peut pas être décodé.");
  }

  if (!metadata.width || !metadata.height || !["png", "jpeg", "webp"].includes(metadata.format ?? "")) {
    throw new MerchantImageValidationError("Format non pris en charge. Utilisez un PNG, JPEG ou WebP.");
  }

  if (
    metadata.width > MAX_MERCHANT_IMAGE_SIDE_PX ||
    metadata.height > MAX_MERCHANT_IMAGE_SIDE_PX ||
    metadata.width * metadata.height > MAX_MERCHANT_IMAGE_PIXELS
  ) {
    throw new MerchantImageValidationError("Les dimensions de l’image dépassent la limite autorisée.");
  }

  const policy = IMAGE_POLICIES[kind];
  const initial = await sharp(source, {
    failOn: "warning",
    limitInputPixels: MAX_MERCHANT_IMAGE_PIXELS,
    pages: 1,
  })
    .autoOrient()
    .metadata();
  const orientedWidth = initial.width ?? metadata.width;
  const orientedHeight = initial.height ?? metadata.height;
  const originalLongestSide = Math.max(orientedWidth, orientedHeight);
  let dimensionLimit = Math.min(policy.maxDimension, originalLongestSide);

  while (dimensionLimit >= Math.min(policy.minLongestSide, originalLongestSide)) {
    for (let quality = policy.initialQuality; quality >= 60; quality -= 5) {
      const { data, info } = await sharp(source, {
        failOn: "warning",
        limitInputPixels: MAX_MERCHANT_IMAGE_PIXELS,
        pages: 1,
      })
        .autoOrient()
        .resize({
          width: dimensionLimit,
          height: dimensionLimit,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality, effort: 4 })
        .toBuffer({ resolveWithObject: true });

      if (data.byteLength <= policy.maxBytes) {
        return { buffer: data, width: info.width, height: info.height };
      }
    }

    if (dimensionLimit <= Math.min(policy.minLongestSide, originalLongestSide)) break;
    dimensionLimit = Math.max(
      Math.min(policy.minLongestSide, originalLongestSide),
      Math.floor(dimensionLimit * 0.9),
    );
  }

  throw new MerchantImageValidationError(
    `L’image ne peut pas être optimisée sous ${policy.maxBytes / 1024} Ko sans perte de qualité excessive.`,
  );
}
