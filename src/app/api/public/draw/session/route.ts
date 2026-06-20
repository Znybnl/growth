import { NextResponse } from "next/server";

import { createDrawSession } from "@/lib/store";
import { logSupportEvent } from "@/lib/support-log";
import { CreateDrawSessionRequest, CreateDrawSessionResult } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as CreateDrawSessionRequest;

  if (!body.campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  try {
    const result = (await createDrawSession(body)) as CreateDrawSessionResult;
    logSupportEvent("info", "draw-session-created", {
      campaignId: result.campaign.id,
      sessionId: result.session.id,
      prizeId: result.prize?.id,
      expiresAt: result.session.expiresAt,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logSupportEvent("error", "draw-session-failed", {
      campaignId: body.campaignId,
      error: error instanceof Error ? error.message : "Draw session failed",
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Draw session failed" },
      { status: 400 },
    );
  }
}
