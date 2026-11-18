export type BrevoSequenceStep =
  | "no_game_day_2"
  | "no_game_day_7"
  | "published_no_play_24h"
  | "published_no_play_72h"
  | "trial_expiry_5d_no_play"
  | "trial_expiry_1d";

export type BrevoSequenceEligibility = {
  step: BrevoSequenceStep;
  trialStartedAt: string;
  trialEndsAt: string | null;
  subscriptionStatus: string | null;
  publishedGameCount: number;
  participationCount: number;
  firstPublishedAt?: string | null;
  timeZone: string;
  now: Date;
  previousSequenceEmailAt?: string | null;
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const SCHEDULER_WINDOW = 5 * 60 * 1000;

function validDate(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function localDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

function localHourDue(trialEnd: Date, daysBefore: number, timeZone: string) {
  const localEnd = localDateParts(trialEnd, timeZone);
  const targetDay = new Date(Date.UTC(localEnd.year, localEnd.month - 1, localEnd.day - daysBefore));
  const target = Date.UTC(targetDay.getUTCFullYear(), targetDay.getUTCMonth(), targetDay.getUTCDate(), 10);
  let guess = target;
  // Resolve the target wall-clock time through the IANA timezone, including DST.
  for (let index = 0; index < 3; index += 1) {
    const formatted = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(guess));
    const part = (type: string) => Number(formatted.find((item) => item.type === type)?.value);
    const observed = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
    guess += target - observed;
  }
  return guess;
}

export function isBrevoSequenceStepDue(input: BrevoSequenceEligibility) {
  const now = input.now.getTime();
  const start = validDate(input.trialStartedAt);
  const end = validDate(input.trialEndsAt);
  const firstPublished = validDate(input.firstPublishedAt);
  if (!start || now < start || input.subscriptionStatus === "active" || (end !== null && now >= end)) return false;

  const previousEmail = validDate(input.previousSequenceEmailAt);
  if (previousEmail !== null && now - previousEmail < DAY) return false;

  switch (input.step) {
    case "no_game_day_2":
      return now >= start + 2 * DAY && now < start + 2 * DAY + SCHEDULER_WINDOW && input.publishedGameCount === 0;
    case "no_game_day_7":
      return now >= start + 7 * DAY && now < start + 7 * DAY + SCHEDULER_WINDOW && input.publishedGameCount === 0;
    case "published_no_play_24h":
      return firstPublished !== null && now >= firstPublished + DAY && now < firstPublished + DAY + SCHEDULER_WINDOW && input.publishedGameCount > 0 && input.participationCount === 0;
    case "published_no_play_72h":
      return firstPublished !== null && now >= firstPublished + 3 * DAY && now < firstPublished + 3 * DAY + SCHEDULER_WINDOW && input.publishedGameCount > 0 && input.participationCount === 0;
    case "trial_expiry_5d_no_play":
      return end !== null && now >= localHourDue(new Date(end), 5, input.timeZone) &&
        now < localHourDue(new Date(end), 5, input.timeZone) + SCHEDULER_WINDOW && input.participationCount === 0;
    case "trial_expiry_1d":
      return end !== null && now >= localHourDue(new Date(end), 1, input.timeZone) &&
        now < localHourDue(new Date(end), 1, input.timeZone) + SCHEDULER_WINDOW;
  }
}

export function localExpirySendTime(trialEnd: string, daysBefore: 5 | 1, timeZone: string) {
  const end = validDate(trialEnd);
  return end === null ? null : new Date(localHourDue(new Date(end), daysBefore, timeZone)).toISOString();
}
