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

type EventBody = {
  campaignId: string;
  leadId?: string;
  eventType: EventType;
  metadata?: Record<string, string | number | boolean | null>;
};

export async function POST(request: Request) {
  const body = (await request.json()) as EventBody;

  if (!isValidPublicIdentifier(body.campaignId) || !isAllowedPublicEventType(body.eventType)) {
    return NextResponse.json({ error: "campaignId and eventType are required" }, { status: 400 });
  }

  try {
    const campaignId = body.campaignId.trim();
    const campaign = await getPublicCampaign(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: "Animation introuvable" }, { status: 404 });
    }

    await assertPersistentPublicRateLimit(request, {
      key: `public-event:${campaignId}:${body.eventType}`,
      limit: 40,
      windowMs: 60 * 1000,
    });

    const event = await recordEvent(
      campaignId,
      body.eventType,
      // A public browser must not be able to attach an arbitrary lead to an
      // analytics event or mutate that lead's action state. Lead association
      // is reserved for trusted server-side flows.
      undefined,
      sanitizePublicMetadata(body.metadata),
    );

    return NextResponse.json({ event }, { status: 201 });
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

