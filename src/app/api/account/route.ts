import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";
import { updateMerchantAccount } from "@/lib/store";
import { MerchantAccountSettingsInput } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedSession();

    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const body = (await request.json()) as MerchantAccountSettingsInput;
    const account = await updateMerchantAccount(session.user.id, body);

    return NextResponse.json(account);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Mise a jour impossible." },
      { status: 400 },
    );
  }
}
