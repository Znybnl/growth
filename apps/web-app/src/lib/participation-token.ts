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
