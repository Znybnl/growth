import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";
import { deleteCampaign, getCampaignPerformance, toggleCampaign } from "@/lib/store";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
  const { id } = await params;
  const body = (await request.json()) as { isActive: boolean };

  try {
    const campaign = await toggleCampaign(id, body.isActive);
    return NextResponse.json({ campaign });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 400 },
    );
  }
}

export async function GET(_request: Request, { params }: RouteProps) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const campaign = await getCampaignPerformance(id, session.merchant);

    if (!campaign || campaign.campaign.merchantId !== session.merchant.id) {
      return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lecture impossible" },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  const { id } = await params;

  try {
    await deleteCampaign(id);
    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 400 },
    );
  }
}
