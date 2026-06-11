import { NextResponse } from "next/server";

import { getMerchantDashboard } from "@/lib/store";

export async function GET() {
  return NextResponse.json(getMerchantDashboard());
}
