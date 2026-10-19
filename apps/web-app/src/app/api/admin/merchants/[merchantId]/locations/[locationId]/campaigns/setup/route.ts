import { NextResponse } from "next/server";

import { assertSaasAdminEmail } from "@/lib/admin";
import { getAuthenticatedSession } from "@/lib/auth";
import { getAdminCampaignContext, getAdminCampaignLocation } from "@/lib/admin-campaign-repository";
import { parseCampaignSetupInput } from "@/lib/merchant-input";
import { saveCampaignSetup } from "@/lib/store";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { logSupportEvent } from "@/lib/support-log";
import { MerchantImageValidationError, optimizeMerchantImage } from "@/lib/merchant-image-processing";
import { deleteMerchantImagesIfUnreferenced, getCampaignMerchantImageUrls, uploadMerchantImage } from "@/lib/merchant-image-storage";

type RouteProps = {
  params: Promise<{ merchantId: string; locationId: string }>;
};

function isAdminAccessError(error: unknown) {
  return error instanceof Error && error.message === "Accès réservé à l'administration.";
}

async function migrateInlineImage(value: string | undefined, kind: "logo" | "background", merchantId: string) {
  if (!value?.startsWith("data:image/")) return value;
  const match = /^data:image\/(png|jpe?g|webp);base64,([a-z0-9+/=\s]+)$/i.exec(value);
  if (!match) return value;
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

export async function POST(request: Request, { params }: RouteProps) {
  try {
    assertTrustedMutationRequest(request);
    const session = await getAuthenticatedSession();
    if (!session) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    assertSaasAdminEmail(session.user.email);

    const { merchantId: accountMerchantId, locationId } = await params;
    const targetLocation = await getAdminCampaignLocation(accountMerchantId, locationId);
    if (!targetLocation) return NextResponse.json({ error: "Établissement introuvable." }, { status: 404 });

    const payload = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json({ error: "Données de jeu invalides." }, { status: 400 });
    }
    const inputPayload = payload as Record<string, unknown>;
    if (inputPayload.merchantId !== locationId) {
      return NextResponse.json({ error: "L’établissement sélectionné ne correspond pas à la requête." }, { status: 403 });
    }

    const isNewCampaign = !inputPayload.id;
    if (!isNewCampaign) {
      const context = await getAdminCampaignContext(String(inputPayload.id), session.user.email, accountMerchantId);
      if (!context || context.targetLocationId !== locationId) {
        return NextResponse.json({ error: "Jeu introuvable." }, { status: 404 });
      }
    }

    const campaignInput = parseCampaignSetupInput(
      { ...inputPayload, isActive: isNewCampaign ? false : inputPayload.isActive },
      locationId,
    );
    let previousImageUrls: string[] = [];
    if (campaignInput.id) {
      previousImageUrls = await getCampaignMerchantImageUrls(locationId, campaignInput.id).catch(() => []);
    }
    campaignInput.logoUrl = await migrateInlineImage(campaignInput.logoUrl, "logo", locationId);
    campaignInput.presentation.background.imageUrl = await migrateInlineImage(
      campaignInput.presentation.background.imageUrl,
      "background",
      locationId,
    ) ?? "";
    if (campaignInput.presentation.poster) {
      campaignInput.presentation.poster.logoUrl = await migrateInlineImage(
        campaignInput.presentation.poster.logoUrl,
        "logo",
        locationId,
      );
      campaignInput.presentation.poster.backgroundImageUrl = await migrateInlineImage(
        campaignInput.presentation.poster.backgroundImageUrl,
        "background",
        locationId,
      );
    }
    campaignInput.adminCreationAudit = isNewCampaign
      ? { adminUserId: session.user.id, accountMerchantId }
      : undefined;

    const campaignId = await saveCampaignSetup(campaignInput);
    if (!campaignId) throw new Error("Le brouillon n’a pas pu être enregistré.");
    try { await deleteMerchantImagesIfUnreferenced(previousImageUrls); }
    catch { /* Do not fail a saved admin campaign if cleanup needs a retry. */ }

    logSupportEvent("info", isNewCampaign ? "admin_campaign_created" : "admin_campaign_updated", {
      merchantId: locationId,
      campaignId,
      adminUserId: session.user.id,
      accountMerchantId,
      targetLocationId: locationId,
    });

    return NextResponse.json({ campaign: { id: campaignId } }, { status: isNewCampaign ? 201 : 200 });
  } catch (error) {
    const status = isAdminAccessError(error)
      ? 403
      : getRequestSecurityErrorStatus(error) === 403
        ? 403
        : error instanceof MerchantImageValidationError
          ? 400
        : error instanceof SyntaxError
          ? 400
          : 500;
    return NextResponse.json(
      { error: status === 403 ? "Accès réservé à l’administration." : error instanceof Error ? error.message : "Enregistrement impossible." },
      { status },
    );
  }
}
