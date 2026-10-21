import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth";
import { isSaasAdminEmail } from "@/lib/admin";
import { getAdminCampaignLocation } from "@/lib/admin-campaign-repository";
import { getReusablePrizes } from "@/lib/reusable-prize-repository";

const headers = { "Cache-Control": "private, no-store" };

export async function handleReusablePrizes(request: Request, target?: { merchantId: string; locationId: string }) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return NextResponse.json({ error: "Authentification requise." }, { status: 401, headers });
    let locationId = session.merchant.id;
    if (target) {
      if (!isSaasAdminEmail(session.user.email)) return NextResponse.json({ error: "Accès réservé à l’administration." }, { status: 403, headers });
      const location = await getAdminCampaignLocation(target.merchantId, target.locationId);
      if (!location || location.locationStatus === "archived") return NextResponse.json({ error: "Établissement introuvable." }, { status: 404, headers });
      locationId = location.id;
    }
    if (session.merchant.locationStatus === "archived" && !target) return NextResponse.json({ error: "Établissement introuvable." }, { status: 404, headers });
    const exclude = new URL(request.url).searchParams.get("excludeCampaignId")?.trim();
    if (exclude && (exclude.length > 200 || !/^[a-zA-Z0-9_-]+$/.test(exclude))) return NextResponse.json({ error: "Identifiant de jeu invalide." }, { status: 400, headers });
    return NextResponse.json({ prizes: await getReusablePrizes(locationId, exclude || undefined) }, { headers });
  } catch {
    return NextResponse.json({ error: "Impossible de charger vos lots précédents. Réessayez dans un instant." }, { status: 500, headers });
  }
}
