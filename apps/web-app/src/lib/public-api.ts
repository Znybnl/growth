import { EventType } from "@/lib/types";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

declare global {
  var __okadoPublicRateLimitStore: Map<string, RateLimitBucket> | undefined;
}

const rateLimitStore =
  globalThis.__okadoPublicRateLimitStore ?? new Map<string, RateLimitBucket>();

globalThis.__okadoPublicRateLimitStore = rateLimitStore;

const PUBLIC_EVENT_TYPES = new Set<EventType>([
  "scan",
  "form_started",
  "review_clicked",
  "review_confirmed",
  "social_clicked",
]);

export function isAllowedPublicEventType(value: string): value is EventType {
  return PUBLIC_EVENT_TYPES.has(value as EventType);
}

export function getPublicClientFingerprint(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const realIp = request.headers.get("x-real-ip")?.trim();
  const userAgent = request.headers.get("user-agent")?.trim() ?? "unknown";

  return `${realIp || forwardedFor}|${userAgent.slice(0, 120)}`;
}

export function assertPublicRateLimit(request: Request, options: RateLimitOptions) {
  const now = Date.now();
  const client = getPublicClientFingerprint(request);
  const storageKey = `${options.key}:${client}`;
  const bucket = rateLimitStore.get(storageKey);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitStore.set(storageKey, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return;
  }

  if (bucket.count >= options.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    const error = new Error("Trop de tentatives. Réessayez dans un instant.");
    (error as Error & { status?: number; retryAfterSeconds?: number }).status = 429;
    (error as Error & { status?: number; retryAfterSeconds?: number }).retryAfterSeconds =
      retryAfterSeconds;
    throw error;
  }

  bucket.count += 1;
  rateLimitStore.set(storageKey, bucket);
}

export function normalizePublicEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidPublicEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizePublicFirstName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function isValidPublicFirstName(value: string) {
  return value.length >= 2 && value.length <= 80;
}

export function isValidPublicIdentifier(value: string, maxLength = 120) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

export function sanitizePublicMetadata(
  metadata?: Record<string, string | number | boolean | null>,
) {
  if (!metadata) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(metadata)
      .slice(0, 12)
      .map(([key, value]) => [
        key.slice(0, 64),
        typeof value === "string" ? value.slice(0, 280) : value,
      ]),
  );
}

export function getPublicErrorStatus(error: unknown) {
  if (
    error instanceof Error &&
    "status" in error &&
    typeof (error as Error & { status?: number }).status === "number"
  ) {
    return (error as Error & { status?: number }).status ?? 400;
  }

  return 400;
}

export function getPublicRetryAfter(error: unknown) {
  if (
    error instanceof Error &&
    "retryAfterSeconds" in error &&
    typeof (error as Error & { retryAfterSeconds?: number }).retryAfterSeconds === "number"
  ) {
    return String((error as Error & { retryAfterSeconds?: number }).retryAfterSeconds);
  }

  return null;
}
