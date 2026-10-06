import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth";

// Like the results link, resolve only a site already authorized for this user.
// No preference is changed here; the account form still requires explicit save.
export async function GET(request: Request) {
  const session = await getAuthenticatedSession();
  if (!session) return NextResponse.redirect(new URL("/connexion", request.url));
  const location = new URL(request.url).searchParams.get("location");
  if (!location || !session.locations.some(l => l.merchant.id === location)) {
    return NextResponse.json({ error: "Accès à cet établissement refusé." }, { status: 403 });
  }
  const response = NextResponse.redirect(new URL("/account#account-user", request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.cookies.set("okado_active_location", location, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/",
  });
  return response;
}
