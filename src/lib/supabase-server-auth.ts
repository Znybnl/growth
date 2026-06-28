import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

import { SUPABASE_AUTH_COOKIE_NAME } from "@/lib/supabase-auth-config";

type CreateRouteSupabaseClientArgs = {
  request: Request;
  response: NextResponse;
};

export function createRouteSupabaseClient({
  request,
  response,
}: CreateRouteSupabaseClientArgs) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase OAuth n'est pas configure.");
  }

  const requestCookies = request.headers.get("cookie") ?? "";
  const cookieMap = new Map<string, string>();

  for (const part of requestCookies.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName) continue;
    cookieMap.set(rawName, rawValue.join("="));
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      name: SUPABASE_AUTH_COOKIE_NAME,
      path: "/",
      sameSite: "lax",
      secure: new URL(request.url).protocol === "https:",
    },
    cookies: {
      getAll() {
        return Array.from(cookieMap.entries()).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          cookieMap.set(cookie.name, cookie.value);
          response.cookies.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });
}
