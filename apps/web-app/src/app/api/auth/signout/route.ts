import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth";
import { createRouteSupabaseClient } from "@/lib/supabase-server-auth";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  const supabase = createRouteSupabaseClient({
    request,
    response,
  });
  await supabase.auth.signOut();
  response.cookies.delete(SESSION_COOKIE);

  return response;
}
