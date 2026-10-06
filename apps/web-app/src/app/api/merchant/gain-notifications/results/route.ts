import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth";
// An explicit e-mail link selects only an establishment already authorized for
// the signed-in user. No campaign/contact is changed and no public token exists.
export async function GET(request: Request) {
  const session = await getAuthenticatedSession();
  if (!session) return NextResponse.redirect(new URL("/connexion", request.url));
  const location = new URL(request.url).searchParams.get("location");
  if (!location || !session.locations.some(l => l.merchant.id === location)) {
    return NextResponse.json({ error: "Accès à cet établissement refusé." }, { status: 403 });
  }
  const response = NextResponse.redirect(new URL("/data", request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.cookies.set("okado_active_location", location, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/",
  });
  return response;
}
