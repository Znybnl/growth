import { NextResponse } from "next/server";

import { isSaasAdminEmail } from "@/lib/admin";
import { getAuthenticatedSession } from "@/lib/auth";
import { getAdminCampaignContext, getAdminCampaignLocations, getAdminDuplicationAccounts } from "@/lib/admin-campaign-repository";
import { buildAdminCampaignCopy } from "@/lib/admin-campaign-duplication";
import { copyCampaignMediaToMerchant, deleteMerchantImagesIfUnreferenced } from "@/lib/merchant-image-storage";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { getCampaignSetupPerformance, saveCampaignSetup } from "@/lib/store";
import { logSupportEvent } from "@/lib/support-log";

type RouteProps = { params: Promise<{ id: string }> };
const noStore = { "Cache-Control": "private, no-store" };

async function sourceContext(params: RouteProps["params"]) {
  const session = await getAuthenticatedSession();
  if (!session) return { error: NextResponse.json({ error: "Authentification requise." }, { status: 401 }) };
  if (!isSaasAdminEmail(session.user.email)) return { error: NextResponse.json({ error: "Accès réservé à l’administration." }, { status: 403 }) };
  const { id } = await params;
  const context = await getAdminCampaignContext(id, session.user.email);
  if (!context || context.targetLocationId !== session.merchant.id) {
    return { error: NextResponse.json({ error: "Ce jeu n’appartient pas à votre établissement actif." }, { status: 404 }) };
  }
  return { session, context, id };
}

export async function GET(request: Request, { params }: RouteProps) {
  try {
    const source = await sourceContext(params);
    if (source.error) return source.error;
    const query = new URL(request.url).searchParams;
    const accountId = query.get("merchantId");
    if (accountId) {
      const locations = await getAdminCampaignLocations(accountId);
      if (!locations.length) return NextResponse.json({ error: "Compte marchand introuvable." }, { status: 404 });
      return NextResponse.json({ locations: locations.filter(({ id }) => id !== source.context.targetLocationId)
        .map(({ id, companyName, city }) => ({ id, companyName, city })) }, { headers: noStore });
    }
    return NextResponse.json(await getAdminDuplicationAccounts(source.session.user.email, query.get("q") ?? "", Number(query.get("page") ?? 1)), { headers: noStore });
  } catch {
    return NextResponse.json({ error: "Impossible de charger les marchands destinataires." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteProps) {
  const created: Array<{ id: string; locationId: string; companyName: string }> = [];
  try {
    assertTrustedMutationRequest(request);
    const source = await sourceContext(params);
    if (source.error) return source.error;
    const payload = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)
      || typeof payload.accountMerchantId !== "string" || !payload.accountMerchantId
      || typeof payload.adaptMerchantIdentity !== "boolean"
      || !Array.isArray(payload.locationIds) || !payload.locationIds.length || payload.locationIds.length > 20
      || !payload.locationIds.every((id: unknown) => typeof id === "string" && Boolean(id))) {
      return NextResponse.json({ error: "Choisissez un marchand et entre 1 et 20 établissements." }, { status: 400 });
    }
    const ids = [...new Set<string>(payload.locationIds)];
    const locations = await getAdminCampaignLocations(payload.accountMerchantId);
    const targets = locations.filter(({ id }) => ids.includes(id) && id !== source.context.targetLocationId);
    if (targets.length !== ids.length) return NextResponse.json({ error: "Un établissement sélectionné ne correspond pas au marchand ou n’est plus disponible." }, { status: 404 });
    const performance = await getCampaignSetupPerformance(source.id, source.context.location);
    if (!performance || performance.campaign.merchantId !== source.context.targetLocationId) {
      return NextResponse.json({ error: "Jeu source introuvable." }, { status: 404 });
    }
    // Validate every target before creating any draft. Each save uses the existing
    // atomic campaign setup service; partial success is explicit and not retried.
    for (const target of targets) {
      const copiedUrls: string[] = [];
      try {
        const input = buildAdminCampaignCopy(performance, source.context.location, target, source.session.user.id, payload.accountMerchantId, payload.adaptMerchantIdentity);
        const copy = await copyCampaignMediaToMerchant(input, source.context.targetLocationId, target.id, copiedUrls);
        const id = await saveCampaignSetup(copy);
        if (!id) throw new Error("Création du brouillon impossible.");
        created.push({ id, locationId: target.id, companyName: target.companyName });
        logSupportEvent("info", "admin_campaign_duplicated", {
          adminUserId: source.session.user.id, sourceCampaignId: source.id,
          merchantId: target.id, campaignId: id, accountMerchantId: payload.accountMerchantId,
        });
      } catch {
        try { await deleteMerchantImagesIfUnreferenced(copiedUrls); } catch { /* Orphan cleanup can retry safely. */ }
        return NextResponse.json({ created, error: "La duplication s’est arrêtée. Les brouillons indiqués ont été créés ; ne les dupliquez pas à nouveau." }, { status: 500, headers: noStore });
      }
    }
    return NextResponse.json({ created }, { status: 201, headers: noStore });
  } catch (error) {
    const status = getRequestSecurityErrorStatus(error) === 403 ? 403 : error instanceof SyntaxError ? 400 : 500;
    return NextResponse.json({ created, error: status === 403 ? "Requête non autorisée." : "Duplication vers le marchand impossible." }, { status, headers: noStore });
  }
}
