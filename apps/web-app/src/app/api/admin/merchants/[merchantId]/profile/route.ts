import { NextResponse } from "next/server";
import { isSaasAdminEmail } from "@/lib/admin";
import { getAuthenticatedSession } from "@/lib/auth";
import { getAdminEstablishmentProfiles } from "@/lib/admin-establishment-repository";
import { logSupportEvent } from "@/lib/support-log";

const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function GET(request: Request, { params }: { params: Promise<{ merchantId: string }> }) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return NextResponse.json({ error: "Authentification requise." }, { status: 401, headers });
    if (!isSaasAdminEmail(session.user.email)) {
      return NextResponse.json({ error: "Accès réservé à l’administration." }, { status: 403, headers });
    }
    const { merchantId } = await params;
    const userId = new URL(request.url).searchParams.get("userId")?.trim();
    if (!userId || userId.length > 100) {
      return NextResponse.json({ error: "Compte utilisateur requis." }, { status: 400, headers });
    }
    const locations = await getAdminEstablishmentProfiles(merchantId, session.user.email, userId);
    if (!locations.length) {
      return NextResponse.json({ error: "Établissement introuvable ou archivé." }, { status: 404, headers });
    }
    return NextResponse.json({ locations }, { headers });
  } catch {
    // Never log raw database/session errors containing personal data or secrets.
    logSupportEvent("error", "admin-establishment-profile-load-failed", {});
    return NextResponse.json(
      { error: "La fiche n’a pas pu être chargée. Réessayez." },
      { status: 503, headers },
    );
  }
}
