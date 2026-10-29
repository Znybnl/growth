"use client";

import { captureClientProductEvent } from "@/lib/client-product-analytics";
import { uploadMerchantImageFile as uploadOptimizedImage } from "@/lib/merchant-image-upload";

/** Keep browser measurement outside the image helpers also used on the server. */
export async function uploadMerchantImageFile(...args: Parameters<typeof uploadOptimizedImage>) {
  const [file, kind, adminTarget] = args;
  const context = { imageKind: kind, sourceBytes: file.size, actor: adminTarget ? "admin" : "merchant" };
  captureClientProductEvent("merchant_image_upload_started", context);
  try {
    const image = await uploadOptimizedImage(...args);
    captureClientProductEvent("merchant_image_upload_completed", { ...context, outputBytes: image.bytes, width: image.width, height: image.height });
    return image;
  } catch (error) {
    captureClientProductEvent("merchant_image_upload_failed", { ...context, errorType: "upload_failed" });
    throw error;
  }
}
