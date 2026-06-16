import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { duplicateCampaign } from "@/lib/store";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: RouteProps) {
  const session = await requireAuthenticatedSession();
  const { id } = await params;

  try {
    const campaign = await duplicateCampaign(id, session.merchant);
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Duplication failed" },
      { status: 400 },
    );
  }
}
