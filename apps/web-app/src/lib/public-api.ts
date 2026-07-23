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

type DailyParticipationLock = {
  campaignId: string;
  dateKey: string;
  expiresAt?: string;
  participationIntervalDays?: number;
};

const DAILY_PARTICIPATION_MESSAGE =
  "Vous avez déjà participé aujourd'hui. Revenez demain pour tenter votre chance à nouveau.";
const DAILY_PARTICIPATION_COOKIE_PREFIX = "okado_played";

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
  "social_clicked",
  "game_lost",
]);

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function fromBase64Url(value: string) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  return Buffer.from(padded.replaceAll("-", "+").replaceAll("_", "/"), "base64").toString("utf8");
}

function getTodayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function getTomorrowStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

export function createDailyParticipationError(participationIntervalDays = 1) {
  const intervalDays = Math.max(1, Math.min(365, participationIntervalDays));
  const message =
    intervalDays === 1
      ? DAILY_PARTICIPATION_MESSAGE
      : `Vous avez déjà participé à cette animation. Vous pourrez rejouer dans ${intervalDays} jours.`;
  const error = new Error(message);
  (error as Error & { code?: string; status?: number; retryAfterSeconds?: number }).code =
    "already_played_today";
  (error as Error & { code?: string; status?: number; retryAfterSeconds?: number }).status = 409;
  (error as Error & { code?: string; status?: number; retryAfterSeconds?: number })
    .retryAfterSeconds = Math.max(1, Math.ceil((getTomorrowStart().getTime() - Date.now()) / 1000));
  return error;
}

export function createPublicRateLimitError(retryAfterSeconds: number) {
  const error = new Error("Trop de tentatives. Réessayez dans un instant.");
  (error as Error & { status?: number; retryAfterSeconds?: number }).status = 429;
  (error as Error & { status?: number; retryAfterSeconds?: number }).retryAfterSeconds =
    Math.max(1, retryAfterSeconds);
  return error;
}

export function isDailyParticipationError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as Error & { code?: string }).code === "already_played_today"
  );
}

export function getDailyParticipationCookieName(campaignId: string) {
  return `${DAILY_PARTICIPATION_COOKIE_PREFIX}_${toBase64Url(campaignId.trim()).slice(0, 80)}`;
}

export function getDailyParticipationCookieValue(
  campaignId: string,
  participationIntervalDays = 1,
  now = new Date(),
) {
  const expiresAt = new Date(
    now.getTime() + Math.max(1, Math.min(365, participationIntervalDays)) * 24 * 60 * 60 * 1000,
  );

  return toBase64Url(
    JSON.stringify({
      campaignId: campaignId.trim(),
      dateKey: getTodayKey(now),
      expiresAt: expiresAt.toISOString(),
      participationIntervalDays: Math.max(1, Math.min(365, participationIntervalDays)),
    }),
  );
}

export function getDailyParticipationCookieOptions(participationIntervalDays = 1) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.max(
      60,
      Math.ceil(Math.max(1, Math.min(365, participationIntervalDays)) * 24 * 60 * 60),
    ),
  };
}

function parseDailyParticipationCookie(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(fromBase64Url(value)) as DailyParticipationLock;
  } catch {
    return null;
  }
}

export function assertDailyParticipationCookie(
  cookieValue: string | undefined,
  campaignId: string,
  now = new Date(),
) {
  const lock = parseDailyParticipationCookie(cookieValue);

  const isStillLocked = lock?.expiresAt
    ? new Date(lock.expiresAt).getTime() > now.getTime()
    : lock?.dateKey === getTodayKey(now);

  if (lock?.campaignId === campaignId.trim() && isStillLocked) {
    throw createDailyParticipationError(lock.participationIntervalDays ?? 1);
  }
}

export function assertDailyParticipationDeviceLock(
  request: Request,
  campaignId: string,
  now = new Date(),
) {
  const storageKey = `daily-play:${campaignId.trim()}:${getTodayKey(now)}:${getPublicClientFingerprint(
    request,
  )}`;

  if (rateLimitStore.has(storageKey)) {
    throw createDailyParticipationError();
  }

  rateLimitStore.set(storageKey, {
    count: 1,
    resetAt: getTomorrowStart(now).getTime(),
  });
}

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
    throw createPublicRateLimitError(retryAfterSeconds);
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

