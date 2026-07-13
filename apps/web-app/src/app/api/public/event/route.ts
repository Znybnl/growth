import { NextResponse } from "next/server";

import {
  getPublicErrorStatus,
  getPublicRetryAfter,
  isAllowedPublicEventType,
  isValidPublicIdentifier,
  sanitizePublicMetadata,
} from "@/lib/public-api";
import { assertPersistentPublicRateLimit } from "@/lib/public-security-store";
import { markActionConfirmed, recordEvent } from "@/lib/store";
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
    await assertPersistentPublicRateLimit(request, {
      key: `public-event:${body.campaignId.trim()}:${body.eventType}`,
      limit: 40,
      windowMs: 60 * 1000,
    });

    const sanitizedLeadId = body.leadId?.trim() || undefined;
    const confirmsAction =
      sanitizedLeadId &&
      ["review_clicked", "review_confirmed", "social_clicked"].includes(body.eventType);

    if (confirmsAction) {
      const confirmedLead = await markActionConfirmed(sanitizedLeadId, body.campaignId.trim());
      if (!confirmedLead) {
        return NextResponse.json({ error: "Participation introuvable pour cette animation" }, { status: 404 });
      }
    }

    const event = await recordEvent(
      body.campaignId.trim(),
      body.eventType,
      sanitizedLeadId,
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
