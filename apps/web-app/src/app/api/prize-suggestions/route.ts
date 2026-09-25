import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";
import { getPrizeSuggestions } from "@/lib/prize-suggestion-repository";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const requestedIndustry = request.nextUrl.searchParams.get("industry")?.trim();
    const industry = requestedIndustry || session.merchant.industry || "";
    const requestedSubsector = request.nextUrl.searchParams.get("subsector")?.trim();
    const industrySubsector = requestedSubsector
      ?? (industry === session.merchant.industry ? session.merchant.industrySubsector : "")
      ?? "";
    const suggestions = await getPrizeSuggestions(industry, false, industrySubsector);
    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lecture impossible." },
      { status: 500 },
    );
  }
}
