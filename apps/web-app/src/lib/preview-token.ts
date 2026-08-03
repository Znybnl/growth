import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

type PreviewAccessClaims = {
  type: "campaign-preview";
  campaignId: string;
  nonce: string;
  exp: number;
};

export type PreviewSessionClaims = {
  type: "preview-session";
  campaignId: string;
  sessionId: string;
  prizeId: string | null;
  nonce: string;
  exp: number;
};

function getPreviewSecret() {
  return (
    process.env.PREVIEW_TOKEN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "okado-preview-token-local-secret"
  );
}

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decode<T>(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

function signPayload(payload: string) {
  return createHmac("sha256", getPreviewSecret()).update(payload).digest("base64url");
}

function sign<T extends object>(claims: T) {
  const payload = encode(claims);
  return `${payload}.${signPayload(payload)}`;
}

function verify<T extends { type: string; campaignId: string; exp: number }>(
  token: string,
  type: T["type"],
  campaignId: string,
) {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;
    const expectedSignature = signPayload(payload);
    const left = Buffer.from(signature);
    const right = Buffer.from(expectedSignature);
    if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

    const claims = decode<T>(payload);
    if (
      claims.type !== type ||
      claims.campaignId !== campaignId ||
      !Number.isFinite(claims.exp) ||
      claims.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return claims;
  } catch {
    return null;
  }
}

export function issuePreviewAccessToken(campaignId: string) {
  const claims: PreviewAccessClaims = {
    type: "campaign-preview",
    campaignId,
    nonce: randomUUID(),
    exp: Math.floor(Date.now() / 1000) + 30 * 60,
  };
  return sign(claims);
}

export function verifyPreviewAccessToken(token: string, campaignId: string) {
  return verify<PreviewAccessClaims>(token, "campaign-preview", campaignId);
}

export function issuePreviewSessionToken(input: {
  campaignId: string;
  sessionId: string;
  prizeId: string | null;
}) {
  return sign({
    type: "preview-session",
    campaignId: input.campaignId,
    sessionId: input.sessionId,
    prizeId: input.prizeId,
    nonce: randomUUID(),
    exp: Math.floor(Date.now() / 1000) + 30 * 60,
  } satisfies PreviewSessionClaims);
}

export function verifyPreviewSessionToken(token: string, campaignId: string, sessionId: string) {
  const claims = verify<PreviewSessionClaims>(token, "preview-session", campaignId);
  return claims?.sessionId === sessionId ? claims : null;
}

export function getPreviewSessionCampaignId(token: string) {
  try {
    const [payload] = token.split(".");
    if (!payload) return "";
    return decode<Pick<PreviewSessionClaims, "campaignId">>(payload).campaignId ?? "";
  } catch {
    return "";
  }
}
