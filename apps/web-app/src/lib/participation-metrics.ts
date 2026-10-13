import type { CampaignEvent, Lead } from "@/lib/types";

/** Same identities as campaign_participations: capturing a contact is not a second play. */
export function participationDates(
  leads: Array<Pick<Lead, "id" | "campaignId" | "createdAt">>,
  events: Array<Pick<CampaignEvent, "id" | "campaignId" | "leadId" | "eventType" | "metadata" | "createdAt">>,
) {
  const sessions = new Map<string, string>();
  for (const event of events) {
    const session = event.metadata?.sessionId;
    if (event.leadId && typeof session === "string" && session &&
        (event.eventType === "lead_created" || event.eventType === "game_played")) {
      const key = `${event.campaignId}:${event.leadId}`;
      const previous = sessions.get(key);
      if (!previous || session < previous) sessions.set(key, session);
    }
  }
  const dates = new Map<string, string>();
  const add = (campaignId: string, identity: string, date: string) => {
    const key = `${campaignId}:${identity}`;
    const previous = dates.get(key);
    if (!previous || date < previous) dates.set(key, date);
  };
  for (const event of events) {
    if (event.eventType !== "game_played") continue;
    const session = typeof event.metadata?.sessionId === "string" && event.metadata.sessionId ||
      (event.leadId ? sessions.get(`${event.campaignId}:${event.leadId}`) : undefined);
    add(event.campaignId, session ? `session:${session}` :
      event.leadId ? `lead:${event.leadId}` : `event:${event.id}`, event.createdAt);
  }
  for (const lead of leads) {
    const session = sessions.get(`${lead.campaignId}:${lead.id}`);
    add(lead.campaignId, session ? `session:${session}` : `lead:${lead.id}`, lead.createdAt);
  }
  return [...dates.values()];
}
