import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";
import { parseMerchantAccountSettingsInput } from "@/lib/merchant-input";
import { updateMerchantAccount } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedSession();

    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const body = parseMerchantAccountSettingsInput(await request.json());
    const account = await updateMerchantAccount(session.user.id, body);

    return NextResponse.json(account);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Mise a jour impossible." },
      { status: 400 },
    );
  }
}
