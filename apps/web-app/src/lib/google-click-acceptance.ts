import { randomUUID } from "node:crypto";
import { assertDataBackendAvailable, getSupabaseAdmin } from "@/lib/supabase";
import { GOOGLE_CLICK_WARNING_TEXT, GOOGLE_CLICK_WARNING_VERSION } from "@/lib/google-click-policy";

const localAcceptances = new Map<string, string>();

export async function recordGoogleClickAcceptance(merchantId: string, actorUserId: string) {
  const id = randomUUID();
  if (assertDataBackendAvailable("l’acceptation du clic Google") === "memory") {
    localAcceptances.set(id, merchantId);
    return id;
  }
  const { error } = await getSupabaseAdmin().from("google_click_warning_acceptances").insert({
    id, merchant_id: merchantId, actor_user_id: actorUserId,
    warning_version: GOOGLE_CLICK_WARNING_VERSION, warning_text: GOOGLE_CLICK_WARNING_TEXT,
  });
  if (error) throw new Error("L’acceptation n’a pas pu être enregistrée. Réessayez.");
  return id;
}

export function hasLocalGoogleClickAcceptance(id: string | undefined, merchantId: string) {
  return Boolean(id && localAcceptances.get(id) === merchantId);
}
