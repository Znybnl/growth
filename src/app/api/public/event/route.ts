import { NextResponse } from "next/server";

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

  if (!body.campaignId || !body.eventType) {
    return NextResponse.json({ error: "campaignId and eventType are required" }, { status: 400 });
  }

  const event = await recordEvent(body.campaignId, body.eventType, body.leadId, body.metadata);

  if (
    body.leadId &&
    (body.eventType === "review_confirmed" || body.eventType === "social_clicked")
  ) {
    await markActionConfirmed(body.leadId);
  }

  return NextResponse.json({ event }, { status: 201 });
}
