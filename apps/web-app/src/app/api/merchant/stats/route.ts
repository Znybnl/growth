import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { getMerchantDashboard } from "@/lib/store";

export async function GET() {
  const session = await requireAuthenticatedSession();
  return NextResponse.json(await getMerchantDashboard(session.merchant.id, session.merchant));
}
