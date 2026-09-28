import { NextResponse } from "next/server";

import { assertSaasAdminEmail } from "@/lib/admin";
import { getAuthenticatedSession } from "@/lib/auth";
import { getAdminCampaignLocation } from "@/lib/admin-campaign-repository";
import { parseCampaignSetupInput } from "@/lib/merchant-input";
import { getSupabaseAdmin } from "@/lib/supabase";
import { saveCampaignSetup } from "@/lib/store";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { logSupportEvent } from "@/lib/support-log";

type RouteProps = {
  params: Promise<{ merchantId: string; locationId: string }>;
};

function isAdminAccessError(error: unknown) {
  return error instanceof Error && error.message === "Accès réservé à l'administration.";
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

    const supabase = getSupabaseAdmin();
    const isNewCampaign = !inputPayload.id;
    if (!isNewCampaign) {
      const existing = await supabase
        .from("campaigns")
        .select("merchant_id,campaign_local_settings")
        .eq("id", String(inputPayload.id))
        .maybeSingle<{ merchant_id: string; campaign_local_settings: Record<string, unknown> | null }>();
      if (existing.error) throw new Error("Vérification du brouillon impossible.");

      const audit = existing.data?.campaign_local_settings?.adminCreation as
        | { adminUserId?: string; accountMerchantId?: string; targetLocationId?: string }
        | undefined;
      if (
        !existing.data ||
        existing.data.merchant_id !== locationId ||
        audit?.adminUserId !== session.user.id ||
        audit.accountMerchantId !== accountMerchantId ||
        audit.targetLocationId !== locationId
      ) {
        return NextResponse.json({ error: "Brouillon introuvable." }, { status: 404 });
      }
    }

    const campaignInput = parseCampaignSetupInput(
      { ...inputPayload, isActive: isNewCampaign ? false : inputPayload.isActive },
      locationId,
    );
    campaignInput.adminCreationAudit = isNewCampaign
      ? { adminUserId: session.user.id, accountMerchantId }
      : undefined;

    const campaignId = await saveCampaignSetup(campaignInput);
    if (!campaignId) throw new Error("Le brouillon n’a pas pu être enregistré.");

    if (isNewCampaign) {
      logSupportEvent("info", "admin_campaign_created", {
        merchantId: locationId,
        campaignId,
        adminUserId: session.user.id,
        accountMerchantId,
        targetLocationId: locationId,
      });
    }

    return NextResponse.json({ campaign: { id: campaignId } }, { status: 201 });
  } catch (error) {
    const status = isAdminAccessError(error)
      ? 403
      : getRequestSecurityErrorStatus(error) === 403
        ? 403
        : error instanceof SyntaxError
          ? 400
          : 500;
    return NextResponse.json(
      { error: status === 403 ? "Accès réservé à l’administration." : error instanceof Error ? error.message : "Enregistrement impossible." },
      { status },
    );
  }
}
