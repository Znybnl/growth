import { NextResponse } from "next/server";

import { getPublicCampaign, recordEvent } from "@/lib/store";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: RouteProps) {
  const { id } = await params;
  let campaign = null;

  try {
    campaign = await getPublicCampaign(id);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Campagne indisponible" },
      { status: 403 },
    );
  }

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  await recordEvent(id, "scan");

  return NextResponse.json({ campaign });
}
