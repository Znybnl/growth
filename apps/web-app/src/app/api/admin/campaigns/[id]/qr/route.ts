import { NextResponse } from "next/server";

import { isSaasAdminEmail } from "@/lib/admin";
import { getAdminCampaignContext } from "@/lib/admin-campaign-repository";
import { getAuthenticatedSession } from "@/lib/auth";
import { createCampaignQrSvg } from "@/lib/campaign-qr";
import { logSupportEvent } from "@/lib/support-log";

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthenticatedSession();
  if (!session) return NextResponse.json({ error: "Authentification requise." }, { status: 401, headers: privateHeaders });
  if (!isSaasAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Accès réservé à l’administration." }, { status: 403, headers: privateHeaders });
  }

  try {
    const { id } = await params;
    const context = await getAdminCampaignContext(id, session.user.email);
    if (!context) return NextResponse.json({ error: "Jeu introuvable." }, { status: 404, headers: privateHeaders });

    // Diffusion only: never issue a test token or publish a draft on download.
    const publicUrl = new URL(`/campaign/${encodeURIComponent(id)}`, request.url);
    const svg = await createCampaignQrSvg(publicUrl.toString());
    logSupportEvent("info", "admin_campaign_qr_downloaded", {
      adminUserId: session.user.id, campaignId: id, merchantId: context.targetLocationId,
    });
    return new NextResponse(svg, {
      headers: {
        ...privateHeaders,
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(id)}-qr.svg"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Impossible de télécharger le QR code de diffusion." }, { status: 500, headers: privateHeaders });
  }
}
