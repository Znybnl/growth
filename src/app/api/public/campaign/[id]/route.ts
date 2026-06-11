import { NextResponse } from "next/server";

import { getPublicCampaign, recordEvent } from "@/lib/store";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: RouteProps) {
  const { id } = await params;
  const campaign = getPublicCampaign(id);

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  recordEvent(id, "scan");

  return NextResponse.json({ campaign });
}
