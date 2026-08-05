import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const allowInsecureLocalTls = process.env.ALLOW_INSECURE_LOCAL_TLS === "true";
const allowMemoryStoreFallback = process.env.ALLOW_MEMORY_STORE_FALLBACK;
let supabaseAdmin: SupabaseClient | undefined;

export function allowLocalTlsBypass() {
  if (
    allowInsecureLocalTls &&
    process.env.NODE_ENV !== "production" &&
    process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0"
  ) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export function isSupabaseOAuthConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function isMemoryStoreFallbackAllowed() {
  if (allowMemoryStoreFallback != null) {
    return allowMemoryStoreFallback === "true";
  }

  return process.env.NODE_ENV !== "production";
}

export function assertDataBackendAvailable(operation: string): "supabase" | "memory" {
  if (isSupabaseConfigured()) {
    return "supabase";
  }

  if (isMemoryStoreFallbackAllowed()) {
    return "memory";
  }

  throw new Error(
    `Supabase n'est pas configuré pour ${operation}. Le fallback mémoire est désactivé dans cet environnement.`,
  );
}

export function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase n'est pas configure.");
  }

  allowLocalTlsBypass();

  // Reuse the server-side client within the runtime instead of recreating it for each query.
  supabaseAdmin ??= createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseAdmin;
}

export function getSupabaseOAuthClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase OAuth n'est pas configure.");
  }

  allowLocalTlsBypass();

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
}

export { supabaseAnonKey, supabaseUrl };
