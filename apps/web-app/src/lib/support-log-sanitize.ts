const sensitiveKeys = new Set([
  "email",
  "emailaddress",
  "recipientemail",
  "leademail",
  "leadid",
  "playerid",
  "userid",
  "merchantuserid",
  "operatoruserid",
  "firstname",
  "lastname",
  "fullname",
  "playername",
  "customername",
  "phone",
  "phonenumber",
  "ip",
  "ipaddress",
  "clientip",
  "remoteaddress",
  "useragent",
  "redemptioncode",
  "pin",
  "merchantpin",
  "redemptionpin",
  "pinhash",
  "redemptionpinhash",
  "password",
  "token",
  "accesstoken",
  "refreshtoken",
  "previewtoken",
  "secret",
  "apikey",
  "authorization",
  "idempotencykey",
  "forcereason",
]);

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const redemptionCodePattern = /\b(?:OK-[A-Z0-9]{8}|SORA-[A-F0-9]{8})\b/gi;
const pinPattern = /\bPIN(?:\s+commerçant)?\s*(?:[:=]\s*)?\d{4}\b/gi;

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isSensitiveKey(key: string) {
  const normalized = normalizeKey(key);
  return sensitiveKeys.has(normalized) || normalized.endsWith("email") || normalized.endsWith("phonenumber");
}

function sanitizeString(value: string) {
  return value
    .replace(emailPattern, "[adresse e-mail masquée]")
    .replace(redemptionCodePattern, "[code de retrait masqué]")
    .replace(pinPattern, "PIN [masqué]");
}

function sanitizeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, seen));
  if (value && typeof value === "object") {
    if (seen.has(value)) return undefined;
    seen.add(value);
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, nestedValue]) => {
        if (isSensitiveKey(key)) return [];
        const sanitized = sanitizeValue(nestedValue, seen);
        return sanitized === undefined ? [] : [[key, sanitized]];
      }),
    );
  }
  return value;
}

export function sanitizeSupportLogPayload(payload?: Record<string, unknown>) {
  if (!payload) return undefined;
  return sanitizeValue(payload, new WeakSet()) as Record<string, unknown>;
}
