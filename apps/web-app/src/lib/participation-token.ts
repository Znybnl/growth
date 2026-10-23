import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  const value = process.env.PREVIEW_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (value) return value;
  if (process.env.NODE_ENV !== "production") return "participation-local-development-only";
  throw new Error("Signature de participation indisponible.");
}

export function issueParticipationToken(campaignId: string, sessionId: string, expiresAt: string) {
  const payload = Buffer.from(JSON.stringify({
    type: "real-participation", campaignId, sessionId, exp: Date.parse(expiresAt),
  })).toString("base64url");
  return `${payload}.${createHmac("sha256", secret()).update(payload).digest("base64url")}`;
}

export function verifyParticipationToken(token: string, campaignId: string, sessionId: string) {
  try {
    if (token.length > 2048) return false;
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [payload, signature] = parts;
    const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
    const left = Buffer.from(signature), right = Buffer.from(expected);
    if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return claims.type === "real-participation" && claims.campaignId === campaignId &&
      claims.sessionId === sessionId && Number.isFinite(claims.exp) && claims.exp > Date.now();
  } catch { return false; }
}

export function issueMarketingClickToken(campaignId: string, eventId: string, actionId: string) {
  const payload = Buffer.from(JSON.stringify({
    type: "marketing-click", campaignId, eventId, actionId, exp: Date.now() + 30 * 60 * 1000,
  })).toString("base64url");
  return `${payload}.${createHmac("sha256", secret()).update(payload).digest("base64url")}`;
}

export function verifyMarketingClickToken(token: string, campaignId: string): { eventId: string; actionId: string } | null {
  try {
    if (token.length > 2048) return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
    const left = Buffer.from(signature), right = Buffer.from(expected);
    if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (claims.type !== "marketing-click" || claims.campaignId !== campaignId ||
      !Number.isFinite(claims.exp) || claims.exp <= Date.now() ||
      typeof claims.eventId !== "string" || typeof claims.actionId !== "string") return null;
    return { eventId: claims.eventId, actionId: claims.actionId };
  } catch { return null; }
}

export function publicPlayerToken(request: Request, campaignId: string) {
  const name = `okado_player_${encodeURIComponent(campaignId).slice(0, 80)}=`;
  return request.headers.get("cookie")?.split(";").map(part => part.trim())
    .find(part => part.startsWith(name))?.slice(name.length);
}
