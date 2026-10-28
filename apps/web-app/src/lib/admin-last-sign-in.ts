import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminLastSignIn =
  | { status: "available"; at: string }
  | { status: "never" }
  | { status: "unavailable" };

/** Server-only usage from protected Pilotage. Never return Auth metadata. */
export async function readAdminLastSignIns(
  supabase: SupabaseClient,
  merchantUserIds: string[],
): Promise<Map<string, AdminLastSignIn>> {
  const result = new Map<string, AdminLastSignIn>(
    merchantUserIds.map((id) => [id, { status: "unavailable" }]),
  );
  if (!result.size) return result;
  const seen = new Set<string>();
  try {
    // Ignore SDK nextPage: multi-digit pages can be parsed incorrectly.
    // Incomplete scans must never claim "never connected".
    for (let page = 1; page <= 500; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
      if (error || !Array.isArray(data?.users)) throw new Error("Auth unavailable");
      for (const user of data.users) {
        const id: unknown = user.app_metadata?.merchant_user_id;
        if (typeof id !== "string" || !result.has(id)) continue;
        if (seen.has(id)) {
          result.set(id, { status: "unavailable" });
          continue;
        }
        seen.add(id);
        const at = user.last_sign_in_at;
        result.set(id, at === null ? { status: "never" }
          : typeof at === "string" && Number.isFinite(Date.parse(at))
            ? { status: "available", at: new Date(at).toISOString() }
            : { status: "unavailable" });
      }
      if (data.users.length < 200) return result;
    }
  } catch {
    // Provider errors can contain personal data: do not log them.
  }
  return new Map(merchantUserIds.map((id) => [id, { status: "unavailable" }]));
}
