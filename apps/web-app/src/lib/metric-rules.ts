// Shared definitions for #498. A click is not proof of an external action.
export const MARKETING_CLICK_TYPES = ["review_clicked", "social_clicked"] as const;
export function isMarketingClick(type: string) {
  return MARKETING_CLICK_TYPES.some((value) => value === type);
}
export function conversionRate(games: number, scans: number) {
  return scans > 0 ? Math.round(games / scans * 100) : 0;
}
export function globalConversion(items: ReadonlyArray<{ kpis: { games: number; scans: number } }>) {
  return conversionRate(items.reduce((n, item) => n + item.kpis.games, 0),
    items.reduce((n, item) => n + item.kpis.scans, 0));
}
export function activeSubscriptionOrTrial(status: string | null, trialEnd: string | null, now = Date.now()) {
  return status === "active" || (trialEnd !== null && Date.parse(trialEnd) >= now) ||
    (status === "trialing" && trialEnd === null);
}
export function stockState(remaining: number | null, initial: number | null) {
  if (remaining === null) return "unlimited" as const;
  if (remaining <= 0) return "exhausted" as const;
  if (initial !== null && initial > 0 && remaining <= Math.max(1, Math.ceil(initial * 0.2))) {
    return "low" as const;
  }
  return "available" as const;
}
export function isPendingGain(lead: { prizeId?: string | null; status: string; rewardExpiresAt?: string | null }, now = Date.now()) {
  return Boolean(lead.prizeId) && lead.status === "claimed" &&
    (!lead.rewardExpiresAt || Date.parse(lead.rewardExpiresAt) >= now);
}
export function effectiveRedemptionDate(
  lead: { id: string; status: string; createdAt: string; redeemedAt?: string | null },
  events: ReadonlyArray<{ leadId?: string; eventType: string; createdAt: string }>,
) {
  if (lead.status !== "redeemed") return undefined;
  if (lead.redeemedAt) return new Date(lead.redeemedAt).toISOString();
  const matching = events.filter((e) => e.leadId === lead.id);
  const reset = matching.filter((e) => e.eventType === "prize_reset")
    .map((e) => e.createdAt).sort((a,b) => Date.parse(a)-Date.parse(b)).at(-1);
  const proven = matching.filter((e) => e.eventType === "prize_redeemed" &&
    Date.parse(e.createdAt) >= Date.parse(lead.createdAt) &&
    Date.parse(e.createdAt) <= Date.now() &&
    (!reset || Date.parse(e.createdAt) > Date.parse(reset)))
    .map((e) => e.createdAt).sort((a,b) => Date.parse(a)-Date.parse(b)).at(-1);
  return proven ? new Date(proven).toISOString() : undefined;
}
export function marketingVolumes(events: ReadonlyArray<{ eventType: string; metadata?: Record<string, unknown> }>,
  actions: ReadonlyArray<{ id: string }>) {
  const counts = new Map<string, number>();
  for (const event of events.filter((e) => isMarketingClick(e.eventType))) {
    const id = typeof event.metadata?.actionId === "string" ? event.metadata.actionId : "";
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const result = actions.map((action, actionIndex) => ({ actionIndex, actionId: action.id, value: counts.get(action.id) ?? 0 }));
  const unknown = [...counts].reduce((n, [id, value]) => n + (actions.some((a) => a.id === id) ? 0 : value), 0);
  if (unknown) result.push({ actionIndex: -1, actionId: "", value: unknown });
  return result;
}
