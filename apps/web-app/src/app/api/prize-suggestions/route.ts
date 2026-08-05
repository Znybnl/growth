import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";
import { getPrizeSuggestions } from "@/lib/prize-suggestion-repository";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const industry = request.nextUrl.searchParams.get("industry") ?? session.merchant.industry ?? "";
    const suggestions = await getPrizeSuggestions(industry);
    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lecture impossible." },
      { status: 500 },
    );
  }
}
