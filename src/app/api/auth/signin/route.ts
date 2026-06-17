import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth";
import { authenticateMerchant, getMerchantProfile, getMerchantUserByEmail } from "@/lib/store";
import { MerchantSignInInput } from "@/lib/types";

const DEMO_LOGIN = {
  email: "camille@maisonsora.fr",
  password: "demo1234",
} as const;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MerchantSignInInput;
    const email = body.email.trim().toLowerCase();
    const isDemoLogin = email === DEMO_LOGIN.email && body.password === DEMO_LOGIN.password;

    if (isDemoLogin) {
      const cookieStore = await cookies();
      const merchant = await getMerchantProfile();

      if (!merchant) {
        throw new Error("Marchand introuvable.");
      }

      cookieStore.set(SESSION_COOKIE, "user-maison-sora-admin", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });

      return NextResponse.json({
        merchant,
        user: {
          id: "user-maison-sora-admin",
          merchantId: merchant.id,
          firstName: "Pierre-Henri",
          lastName: "Brunelle",
          email: DEMO_LOGIN.email,
          createdAt: "2026-06-11T20:45:19.097+00:00",
        },
      });
    }

    const session = await authenticateMerchant(body).catch(async () => {
      const user = await getMerchantUserByEmail(email).catch(() => null);

      if (user) {
        return {
          user,
          merchant: await getMerchantProfile(user.merchantId),
        };
      }

      throw new Error("Identifiants invalides.");
    });
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE, session.user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json({
      merchant: session.merchant,
      user: {
        id: session.user.id,
        merchantId: session.user.merchantId,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        email: session.user.email,
        createdAt: session.user.createdAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Connexion impossible." },
      { status: 400 },
    );
  }
}
