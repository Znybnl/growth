import { getSupabaseAdmin } from "@/lib/supabase";

export type RewardReminderSettings = { enabled: boolean; days: number; canEdit: boolean; updatedAt: string | null };
export class RewardReminderAccessError extends Error {}
export function parseRewardReminderSettings(value: unknown): RewardReminderSettings {
  const settings = value as Partial<RewardReminderSettings> | null;
  if (!settings || typeof settings.enabled !== "boolean" || !Number.isInteger(settings.days) ||
    settings.days! < 1 || settings.days! > 365 || typeof settings.canEdit !== "boolean" ||
    !(settings.updatedAt === null || typeof settings.updatedAt === "string")) throw new Error("Réglage de relance indisponible.");
  return settings as RewardReminderSettings;
}
export async function getRewardReminderSettings(userId: string, workspaceId: string) {
  const { data, error } = await getSupabaseAdmin().rpc("get_reward_reminder_settings", { p_user: userId, p_workspace: workspaceId });
  if (error?.code === "42501") throw new RewardReminderAccessError("Accès refusé.");
  if (error) throw new Error("Réglage de relance indisponible.");
  return parseRewardReminderSettings(data);
}
export async function saveRewardReminderSettings(userId: string, workspaceId: string, enabled: boolean, days: number) {
  const { data, error } = await getSupabaseAdmin().rpc("set_reward_reminder_settings", {
    p_user: userId, p_workspace: workspaceId, p_enabled: enabled, p_days: days,
  });
  if (error?.code === "42501") throw new RewardReminderAccessError("Accès refusé.");
  if (error) throw new Error("Enregistrement de la relance impossible.");
  return parseRewardReminderSettings(data);
}
