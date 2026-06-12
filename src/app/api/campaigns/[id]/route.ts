import { NextResponse } from "next/server";

import { toggleCampaign } from "@/lib/store";

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
