import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { duplicateCampaign } from "@/lib/store";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  try {
    assertTrustedMutationRequest(request);
    const session = await requireAuthenticatedSession();
    const { id } = await params;
    const campaign = await duplicateCampaign(id, session.merchant);
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Duplication failed" },
      { status: getRequestSecurityErrorStatus(error) },
    );
  }
}
