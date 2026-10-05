import { NextResponse } from "next/server";

import { isSaasAdminEmail } from "@/lib/admin";
import { getAdminCampaignContext } from "@/lib/admin-campaign-repository";
import { getAuthenticatedSession } from "@/lib/auth";
import { createCampaignQrSvg } from "@/lib/campaign-exports";
import { issuePreviewAccessToken } from "@/lib/preview-token";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthenticatedSession();
  if (!session) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  if (!isSaasAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Accès réservé à l’administration." }, { status: 403 });
  }
  const { id } = await params;
  const context = await getAdminCampaignContext(id, session.user.email);
  if (!context) return NextResponse.json({ error: "Jeu introuvable." }, { status: 404 });

  const requestUrl = new URL(request.url);
  const isQr = requestUrl.searchParams.get("format") === "qr";
  const embed = !isQr && requestUrl.searchParams.get("embed") === "1";
  const url = new URL(`/campaign/${encodeURIComponent(id)}${embed ? "/preview-embed" : ""}`, requestUrl.origin);
  url.searchParams.set("preview", "1");
  url.searchParams.set("previewToken", issuePreviewAccessToken(id));

  if (isQr) {
    return new NextResponse(await createCampaignQrSvg(url.toString()), {
      headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "private, no-store" },
    });
  }
  // A scoped, short-lived test token uses the existing isolated public preview flow.
  return NextResponse.redirect(url, { headers: { "Cache-Control": "private, no-store" } });
}
