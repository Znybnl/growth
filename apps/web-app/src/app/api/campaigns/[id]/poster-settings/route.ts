import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { getCampaignPerformance, updateCampaignPosterSettings } from "@/lib/store";
import { CampaignPosterSettings } from "@/lib/types";
import { deleteMerchantImagesIfUnreferenced, getCampaignMerchantImageUrls, uploadMerchantImage } from "@/lib/merchant-image-storage";
import { MerchantImageValidationError, optimizeMerchantImage } from "@/lib/merchant-image-processing";

async function migrateInlineImage(value: string | undefined, kind: "logo" | "background", merchantId: string) {
  if (!value?.startsWith("data:image/")) return value;
  const match = /^data:image\/(png|jpe?g|webp);base64,([a-z0-9+/=\s]+)$/i.exec(value);
  if (!match) return value; // Keep previously accepted animated GIFs readable.
  const source = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  const optimized = await optimizeMerchantImage(source, kind);
  const stored = await uploadMerchantImage({
    buffer: optimized.buffer,
    kind,
    merchantId,
    width: optimized.width,
    height: optimized.height,
  });
  return stored.url;
}

type PosterSettingsRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: PosterSettingsRouteProps) {
  try {
    assertTrustedMutationRequest(request);
    const session = await requireAuthenticatedSession();
    const { id } = await params;
    const payload = (await request.json()) as
      | CampaignPosterSettings
      | { poster: CampaignPosterSettings; wheelSubtitle?: string };
    const poster = "poster" in payload ? payload.poster : payload;
    const wheelSubtitle = "poster" in payload ? payload.wheelSubtitle : undefined;
    const performance = await getCampaignPerformance(id, session.merchant);

    if (!performance || performance.campaign.merchantId !== session.merchant.id) {
      return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
    }

    const previousImageUrls = await getCampaignMerchantImageUrls(session.merchant.id, id).catch(() => []);
    poster.logoUrl = await migrateInlineImage(poster.logoUrl, "logo", session.merchant.id);
    poster.backgroundImageUrl = await migrateInlineImage(
      poster.backgroundImageUrl,
      "background",
      session.merchant.id,
    );
    await updateCampaignPosterSettings(id, poster, session.merchant.id, wheelSubtitle);
    try { await deleteMerchantImagesIfUnreferenced(previousImageUrls); }
    catch { /* Keep a successful settings save independent from best-effort cleanup. */ }

    return NextResponse.json({ campaign: performance.campaign });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Mise à jour impossible" },
      { status: error instanceof MerchantImageValidationError ? 400 : getRequestSecurityErrorStatus(error) },
    );
  }
}
