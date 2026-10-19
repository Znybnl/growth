import { NextResponse } from "next/server";

import { isSaasAdminEmail } from "@/lib/admin";
import { getAdminCampaignContext } from "@/lib/admin-campaign-repository";
import { getAuthenticatedSession } from "@/lib/auth";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { updateCampaignPosterSettings } from "@/lib/store";
import type { CampaignPosterSettings } from "@/lib/types";
import { logSupportEvent } from "@/lib/support-log";

type AdminPosterSettingsRouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: AdminPosterSettingsRouteProps) {
  try {
    assertTrustedMutationRequest(request);
    const session = await getAuthenticatedSession();
    if (!session) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    if (!isSaasAdminEmail(session.user.email)) {
      return NextResponse.json({ error: "Accès réservé à l’administration." }, { status: 403 });
    }

    const { id } = await params;
    const context = await getAdminCampaignContext(id, session.user.email);
    if (!context) return NextResponse.json({ error: "Jeu introuvable." }, { status: 404 });

    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Paramètres d’affiche invalides." }, { status: 400 });
    }

    const payload = body as
      | CampaignPosterSettings
      | { poster: CampaignPosterSettings; wheelSubtitle?: string };
    const poster = "poster" in payload ? payload.poster : payload;
    const wheelSubtitle = "poster" in payload ? payload.wheelSubtitle : undefined;
    if (!poster || typeof poster !== "object") {
      return NextResponse.json({ error: "Paramètres d’affiche invalides." }, { status: 400 });
    }

    await updateCampaignPosterSettings(id, poster, context.targetLocationId, wheelSubtitle);
    logSupportEvent("info", "admin_campaign_poster_updated", {
      merchantId: context.targetLocationId,
      campaignId: id,
      adminUserId: session.user.id,
    });

    return NextResponse.json({ campaignId: id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Mise à jour impossible." },
      { status: getRequestSecurityErrorStatus(error) },
    );
  }
}
