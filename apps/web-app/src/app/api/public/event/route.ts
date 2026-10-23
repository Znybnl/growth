import { NextResponse } from "next/server";

import {
  getPublicErrorStatus,
  getPublicRetryAfter,
  isAllowedPublicEventType,
  isValidPublicIdentifier,
  sanitizePublicMetadata,
} from "@/lib/public-api";
import { assertPersistentPublicRateLimit } from "@/lib/public-security-store";
import { getPublicCampaign, recordEvent } from "@/lib/store";
import { EventType } from "@/lib/types";
import { issueMarketingClickToken, publicPlayerToken } from "@/lib/participation-token";

type EventBody = {
  campaignId: string;
  leadId?: string;
  eventType: EventType;
  metadata?: Record<string, string | number | boolean | null>;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as EventBody | null;

  if (!body || !isValidPublicIdentifier(body.campaignId) || !isAllowedPublicEventType(body.eventType)) {
    return NextResponse.json({ error: "campaignId and eventType are required" }, { status: 400 });
  }

  try {
    const campaignId = body.campaignId.trim();
    const campaign = await getPublicCampaign(campaignId, publicPlayerToken(request, campaignId));
    if (!campaign) {
      return NextResponse.json({ error: "Animation introuvable" }, { status: 404 });
    }

    await assertPersistentPublicRateLimit(request, {
      key: `public-event:${campaignId}:${body.eventType}`,
      limit: 40,
      windowMs: 60 * 1000,
    });

    const isClick = body.eventType === "review_clicked" || body.eventType === "social_clicked";
    if (isClick && (body.metadata?.actionId !== undefined || body.metadata?.eventId !== undefined)) {
      if (typeof body.metadata?.actionId !== "string" || typeof body.metadata?.eventId !== "string" ||
        !isValidPublicIdentifier(body.metadata.actionId) || !isValidPublicIdentifier(body.metadata.eventId)) {
        return NextResponse.json({ error: "Action ou événement invalide" }, { status: 400 });
      }
      const action = campaign.actions.find(a => a.id === body.metadata?.actionId);
      if (!action || (action.kind === "google") !== (body.eventType === "review_clicked")) {
        return NextResponse.json({ error: "Action indisponible" }, { status: 400 });
      }
    }

    const event = await recordEvent(
      campaignId,
      body.eventType,
      // A public browser must not be able to attach an arbitrary lead to an
      // analytics event or mutate that lead's action state. Lead association
      // is reserved for trusted server-side flows.
      undefined,
      sanitizePublicMetadata(body.metadata),
    );

    const marketingClickToken = isClick && typeof body.metadata?.actionId === "string" && typeof body.metadata?.eventId === "string"
      ? issueMarketingClickToken(campaignId, event.id, body.metadata.actionId) : undefined;
    return NextResponse.json({ event, marketingClickToken }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const retryAfter = getPublicRetryAfter(error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Enregistrement impossible" },
      {
        status: getPublicErrorStatus(error),
        headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
      },
    );
  }
}
