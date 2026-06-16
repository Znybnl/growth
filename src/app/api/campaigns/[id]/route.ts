import { NextResponse } from "next/server";

import { deleteCampaign, toggleCampaign } from "@/lib/store";

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
