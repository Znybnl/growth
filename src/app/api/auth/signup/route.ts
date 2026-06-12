import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth";
import { createMerchantAccount } from "@/lib/store";
import { MerchantSignUpInput } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MerchantSignUpInput;
    const session = await createMerchantAccount(body);
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE, session.user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json(
      {
        merchant: session.merchant,
        user: {
          id: session.user.id,
          merchantId: session.user.merchantId,
          firstName: session.user.firstName,
          lastName: session.user.lastName,
          email: session.user.email,
          createdAt: session.user.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Inscription impossible." },
      { status: 400 },
    );
  }
}
