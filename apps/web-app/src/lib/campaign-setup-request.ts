export async function postCampaignSetup<TPayload>(payload: unknown) {
  const serializationStartedAt = performance.now();
  const body = JSON.stringify(payload);
  const serializationMs = Math.round((performance.now() - serializationStartedAt) * 10) / 10;

  const response = await fetch("/api/campaigns/setup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Okado-Setup-Serialize-Ms": String(serializationMs),
      "X-Okado-Setup-Payload-Chars": String(body?.length ?? 0),
    },
    body,
  });

  const result = (await response.json().catch(() => null)) as TPayload | null;
  return { response, payload: result };
}
