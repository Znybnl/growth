import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { getSupabaseLeadRewardEmailHistory } from "@/lib/campaign-repository";

type LeadEmailRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: LeadEmailRouteProps) {
  const session = await requireAuthenticatedSession();
  const { id } = await params;

  try {
    const history = await getSupabaseLeadRewardEmailHistory(id, session.merchant.id);
    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lecture impossible" },
      { status: 400 },
    );
  }
}
