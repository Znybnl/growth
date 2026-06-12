import { NextResponse } from "next/server";

import { drawForLead } from "@/lib/store";

type DrawBody = {
  campaignId: string;
  firstName: string;
  email: string;
  marketingConsent: boolean;
};

export async function POST(request: Request) {
  const body = (await request.json()) as DrawBody;

  if (!body.campaignId || !body.firstName || !body.email || !body.marketingConsent) {
    return NextResponse.json(
      { error: "campaignId, firstName, email and marketingConsent are required" },
      { status: 400 },
    );
  }

  try {
    const result = await drawForLead(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Draw failed" },
      { status: 400 },
    );
  }
}
