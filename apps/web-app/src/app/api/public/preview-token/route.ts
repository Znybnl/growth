import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";
import { assertPersistentPublicRateLimit } from "@/lib/public-security-store";
import { issuePreviewAccessToken } from "@/lib/preview-token";
import { getCampaignPreview, getPublicCampaign } from "@/lib/store";
import { isValidPublicIdentifier } from "@/lib/public-api";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { campaignId?: string } | null;
  const campaignId = body?.campaignId?.trim() ?? "";

  if (!isValidPublicIdentifier(campaignId)) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  try {
    await assertPersistentPublicRateLimit(request, {
      key: `preview-token:${campaignId}`,
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });

    let campaign = null;
    try {
      campaign = await getPublicCampaign(campaignId);
    } catch {
      const session = await getAuthenticatedSession();
      if (session) {
        campaign = await getCampaignPreview(campaignId, session.merchant);
      }
    }
    if (!campaign) {
      return NextResponse.json({ error: "Animation introuvable" }, { status: 404 });
    }

    return NextResponse.json(
      { token: issuePreviewAccessToken(campaignId), expiresInSeconds: 30 * 60 },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Jeton de prévisualisation indisponible" },
      { status: 429 },
    );
  }
}