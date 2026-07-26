import { NextRequest, NextResponse } from "next/server";

import { getPublicCampaign, recordEvent } from "@/lib/store";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteProps) {
  const { id } = await params;
  let campaign = null;

  try {
    const participantCookie = `okado_player_${encodeURIComponent(id).slice(0, 80)}`;
    campaign = await getPublicCampaign(id, request.cookies.get(participantCookie)?.value);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Campagne indisponible" },
      { status: 403 },
    );
  }

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const isPreview = request.nextUrl.searchParams.get("preview") === "1";
  const scanCookie = `okado_scan_${encodeURIComponent(id).slice(0, 80)}`;
  const alreadyCounted = request.cookies.get(scanCookie)?.value === "1";
  if (!isPreview && !alreadyCounted) {
    await recordEvent(id, "scan");
  }

  const response = NextResponse.json({ campaign });
  if (!isPreview && !alreadyCounted) {
    response.cookies.set(scanCookie, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 6 * 60 * 60,
    });
  }
  return response;
}
