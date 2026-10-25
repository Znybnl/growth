import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";

const stages = ["parse", "rateLimit", "campaignLookup", "dailyLock", "sessionCreation", "analytics", "releaseLock"];
const validMs = value => typeof value === "number" && Number.isFinite(value) && value >= 0;
function distribution(values) {
  const sorted = values.toSorted((a, b) => a - b);
  const percentile = p => sorted.length ? sorted[Math.ceil(p * sorted.length) - 1] : null;
  return { samples: sorted.length, p50Ms: percentile(0.5), p95Ms: percentile(0.95) };
}

/** Accept raw structured logs or the message field of a Vercel JSONL record. */
export function parseMeasurement(line) {
  try {
    let value = JSON.parse(line);
    if (typeof value.message === "string") value = JSON.parse(value.message);
    if (value.event !== "okado.draw_preparation" || value.schemaVersion !== 1 ||
        !["production", "preview", "unknown"].includes(value.mode) ||
        !Number.isInteger(value.status) || value.status < 100 || value.status > 599 || !validMs(value.totalMs)) return null;
    return { mode: value.mode, status: value.status, totalMs: value.totalMs,
      stages: Object.fromEntries(stages.filter(stage => validMs(value.stages?.[stage]))
        .map(stage => [stage, value.stages[stage]])) };
  } catch { return null; }
}

export function summarizeMeasurements(records) {
  return Object.fromEntries(["production", "preview", "unknown"].map(mode => {
    const rows = records.filter(row => row.mode === mode);
    const successes = rows.filter(row => row.status >= 200 && row.status < 300);
    const refusals = rows.filter(row => row.status >= 400 && row.status < 500).length;
    const serverErrors = rows.filter(row => row.status >= 500).length;
    return [mode, {
      requests: rows.length, successes: successes.length, refusals, serverErrors,
      serverErrorRate: rows.length ? serverErrors / rows.length : null,
      allResponses: distribution(rows.map(row => row.totalMs)),
      successfulResponses: distribution(successes.map(row => row.totalMs)),
      successfulStages: Object.fromEntries(stages.map(stage => [stage,
        distribution(successes.map(row => row.stages[stage]).filter(validMs))])),
    }];
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const records = [];
  for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
    const measurement = parseMeasurement(line);
    if (measurement) records.push(measurement);
  }
  console.log(JSON.stringify({ schemaVersion: 1, sampledRequests: records.length,
    note: "Observed log sample only; missing or truncated logs are not zero traffic. Durations exclude network and cold start before handler entry.",
    modes: summarizeMeasurements(records) }, null, 2));
}
