import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";
import { assertSaasAdminEmail } from "@/lib/admin";
import { getAdminCampaignLocation } from "@/lib/admin-campaign-repository";
import {
  MAX_MERCHANT_IMAGE_SOURCE_BYTES,
  MerchantImageValidationError,
  optimizeMerchantImage,
  type MerchantImageKind,
} from "@/lib/merchant-image-processing";
import { uploadMerchantImage } from "@/lib/merchant-image-storage";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";

export const runtime = "nodejs";

const MAX_MULTIPART_REQUEST_BYTES = Math.floor(4.5 * 1024 * 1024);

export async function POST(request: Request) {
  try {
    assertTrustedMutationRequest(request);

    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_REQUEST_BYTES) {
      return NextResponse.json({ error: "L’image doit peser 4 Mo maximum." }, { status: 413 });
    }

    const session = await getAuthenticatedSession();
    if (!session) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const kind = formData.get("kind");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Sélectionnez une image à importer." }, { status: 400 });
    }
    if (kind !== "logo" && kind !== "background") {
      return NextResponse.json({ error: "Type d’image non reconnu." }, { status: 400 });
    }

    const accountMerchantId = formData.get("accountMerchantId");
    const locationId = formData.get("locationId");
    let merchantId = session.merchant.id;
    if (accountMerchantId !== null || locationId !== null) {
      assertSaasAdminEmail(session.user.email);
      if (typeof accountMerchantId !== "string" || typeof locationId !== "string") {
        return NextResponse.json({ error: "Établissement non valide." }, { status: 400 });
      }
      const location = await getAdminCampaignLocation(accountMerchantId, locationId);
      if (!location) return NextResponse.json({ error: "Établissement non autorisé." }, { status: 403 });
      merchantId = location.id;
    }
    if (file.size === 0 || file.size > MAX_MERCHANT_IMAGE_SOURCE_BYTES) {
      return NextResponse.json({ error: "L’image doit peser 4 Mo maximum." }, { status: 413 });
    }

    // Do not trust the extension, submitted MIME type or original filename. Sharp
    // verifies the encoded format and decodes the bytes before any storage write.
    const source = Buffer.from(await file.arrayBuffer());
    const optimized = await optimizeMerchantImage(source, kind as MerchantImageKind);
    const stored = await uploadMerchantImage({
      buffer: optimized.buffer,
      kind: kind as MerchantImageKind,
      merchantId,
      width: optimized.width,
      height: optimized.height,
    });

    return NextResponse.json({
      image: {
        url: stored.url,
        width: optimized.width,
        height: optimized.height,
        contentType: "image/webp",
        bytes: optimized.buffer.byteLength,
      },
    }, { status: 201 });
  } catch (error) {
    const securityStatus = getRequestSecurityErrorStatus(error);
    const status = securityStatus === 403
      ? securityStatus
      : error instanceof MerchantImageValidationError
        ? 400
        : 500;
    const message = status === 403
      ? "Accès non autorisé. Vérifiez votre session et l’établissement sélectionné."
      : error instanceof MerchantImageValidationError
        ? error.message
        : "L’image n’a pas pu être optimisée. Réessayez avec un autre fichier.";
    return NextResponse.json({ error: message }, { status });
  }
}
