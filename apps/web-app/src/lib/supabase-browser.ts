"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_AUTH_COOKIE_NAME } from "@/lib/supabase-auth-config";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase OAuth n'est pas configure.");
  }

  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      cookieOptions: {
        name: SUPABASE_AUTH_COOKIE_NAME,
        path: "/",
        sameSite: "lax",
        secure: window.location.protocol === "https:",
      },
    });
  }

  return browserClient;
}
