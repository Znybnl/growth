import type { RewardEmailDelivery, RewardEmailEvent } from "./types";

function sameTimestamp(a: unknown, b: string): boolean {
  if (typeof a !== "string") return false;
  const microseconds = (value: string) => {
    const match = value.match(/\.(\d+)/);
    return (match?.[1] ?? "").padEnd(6, "0").slice(0, 6);
  };
  const first = Date.parse(a);
  const second = Date.parse(b);
  return Number.isFinite(first) && first === second && microseconds(a) === microseconds(b);
}

/** Only classify the current provider event; old or ambiguous bounces remain unknown. */
export function isPermanentRewardEmailBounce(
  delivery: RewardEmailDelivery | null,
  events: RewardEmailEvent[],
): boolean {
  if (delivery?.status !== "bounced" || !delivery.resendEmailId || !delivery.lastEventAt) return false;
  if (delivery.bounceType === "Permanent") return true;
  const lastEventAt = delivery.lastEventAt;
  return events.some((event) => {
    if (event.eventType !== "email.bounced" || event.resendEmailId !== delivery.resendEmailId) return false;
    const payload = event.payload;
    if (!payload || !sameTimestamp(payload.created_at, lastEventAt)) return false;
    const data = payload.data;
    if (!data || typeof data !== "object" || !("bounce" in data)) return false;
    const bounce = data.bounce;
    return Boolean(bounce && typeof bounce === "object" && "type" in bounce && bounce.type === "Permanent");
  });
}
