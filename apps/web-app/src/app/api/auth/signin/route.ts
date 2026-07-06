import { NextResponse } from "next/server";

import {
  ensureDemoMerchantInSupabase,
  resolveMerchantSessionFromAuthUser,
} from "@/lib/merchant-account-repository";
import { authenticateMerchant } from "@/lib/store";
import { MerchantSignInInput } from "@/lib/types";
import { createRouteSupabaseClient } from "@/lib/supabase-server-auth";

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
}

export async function POST(request: Request) {
  const provisionalResponse = NextResponse.json({});

  try {
    const body = (await request.json()) as MerchantSignInInput;
    const email = body.email.trim().toLowerCase();
    const supabase = createRouteSupabaseClient({
      request,
      response: provisionalResponse,
    });

    let signInResult = await supabase.auth.signInWithPassword({
      email,
      password: body.password,
    });

    if (signInResult.error || !signInResult.data.user) {
      if (email === "camille@maisonsora.fr" && body.password === "demo1234") {
        await ensureDemoMerchantInSupabase();
      }

      await authenticateMerchant({
        email,
        password: body.password,
      });

      signInResult = await supabase.auth.signInWithPassword({
        email,
        password: body.password,
      });
    }

    if (signInResult.error || !signInResult.data.user) {
      throw new Error(signInResult.error?.message ?? "Connexion impossible.");
    }

    const payload = await resolveMerchantSessionFromAuthUser(signInResult.data.user);
    const response = NextResponse.json({
      merchant: payload.merchant,
      user: {
        id: payload.user.id,
        merchantId: payload.user.merchantId,
        firstName: payload.user.firstName,
        lastName: payload.user.lastName,
        email: payload.user.email,
        createdAt: payload.user.createdAt,
      },
    });

    copyCookies(provisionalResponse, response);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Connexion impossible." },
      { status: 400 },
    );
  }
}
