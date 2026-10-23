import { getAuthenticatedSession } from "@/lib/auth";
import { isSaasAdminEmail } from "@/lib/admin";
import { getAdminCampaignLocation } from "@/lib/admin-campaign-repository";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { recordGoogleClickAcceptance } from "@/lib/google-click-acceptance";
import { GOOGLE_CLICK_WARNING_VERSION } from "@/lib/google-click-policy";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    assertTrustedMutationRequest(request);
    const session = await getAuthenticatedSession();
    if (!session) return Response.json({ error: "Authentification requise." }, { status: 401, headers });
    const body = await request.json().catch(() => null);
    if (!body || body.accepted !== true || body.version !== GOOGLE_CLICK_WARNING_VERSION ||
      typeof body.locationId !== "string" || body.locationId.length > 120) {
      return Response.json({ error: "Confirmez l’avertissement actuel." }, { status: 400, headers });
    }
    const location = body.adminAccountMerchantId
      ? isSaasAdminEmail(session.user.email) && typeof body.adminAccountMerchantId === "string"
        ? await getAdminCampaignLocation(body.adminAccountMerchantId, body.locationId) : null
      : session.locations.find(({ merchant }) => merchant.id === body.locationId)?.merchant;
    if (!location || location.locationStatus === "archived") {
      return Response.json({ error: "Accès à cet établissement refusé." }, { status: 403, headers });
    }
    const acceptanceId = await recordGoogleClickAcceptance(body.locationId, session.user.id);
    return Response.json({ acceptanceId }, { status: 201, headers });
  } catch (error) {
    const status = getRequestSecurityErrorStatus(error) === 403 ? 403 : 503;
    return Response.json({ error: "L’acceptation n’a pas pu être enregistrée. Réessayez." }, { status, headers });
  }
}
