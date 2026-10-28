import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { completedResults, summarizeEventCounts, summarizeFunnel, validateAcquisitionDefinition } from "./conversion-audit-results.mjs";

// Private API only: never use the public ingestion key for this audit.
// Read-only by default. --configure-insights only changes the named reports.
const projectId = 212872;
const origin = "https://eu.posthog.com";
const envFile = fileURLToPath(new URL("../apps/web-app/.env.local", import.meta.url));
if (!process.env.POSTHOG_PERSONAL_API_KEY && existsSync(envFile)) process.loadEnvFile(envFile);
if (process.env.POSTHOG_PROJECT_ID !== String(projectId)) throw new Error("Expected PostHog project 212872");
if (new URL(process.env.POSTHOG_API_HOST || origin).origin !== origin) throw new Error("Expected PostHog EU API");
if (!process.env.POSTHOG_PERSONAL_API_KEY) throw new Error("POSTHOG_PERSONAL_API_KEY is required (private, untracked)");
const configure = process.argv.includes("--configure-insights");
if (process.argv.slice(2).some((arg) => arg !== "--configure-insights")) throw new Error("Unknown argument");
const root = `${origin}/api/projects/${projectId}/`;

async function api(path, method = "GET", body) {
  const url = new URL(path, root);
  if (!url.href.startsWith(root)) throw new Error("API request outside the authorized project");
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(90000),
  });
  // Never include credentials, arbitrary API bodies or individual event rows in errors.
  if (!response.ok) {
    throw new Error(`PostHog ${method} ${url.pathname}: HTTP ${response.status}`);
  }
  return response.json();
}

const project = await api("");
if (project.id !== projectId) throw new Error("PostHog project response mismatch");
const common = [
  { key: "environment", type: "event", operator: "exact", value: "production" },
  { key: "consentVersion", type: "event", operator: "exact", value: "2026-10-15" },
  { key: "trackingVersion", type: "event", operator: "exact", value: "v1" },
];
const dateRange = { date_from: "-28d" };
const funnel = (series, interval, unit) => ({
  kind: "FunnelsQuery", series: series.map((event) => ({ kind: "EventsNode", event })),
  dateRange: unit === "day" ? { date_from: "-90d" } : dateRange, properties: common, filterTestAccounts: true,
  funnelsFilter: { funnelOrderType: "ordered", funnelVizType: "steps", funnelStepReference: "total", funnelWindowInterval: interval, funnelWindowIntervalUnit: unit },
});
const main = (await api("insights/?short_id=0gtandAv")).results.find((item) => item.short_id === "0gtandAv");
if (!main || main.query?.source?.kind !== "FunnelsQuery") throw new Error("Expected acquisition funnel 0gtandAv");
const mainQuery = structuredClone(main.query.source);
validateAcquisitionDefinition(mainQuery);
mainQuery.properties = common;
mainQuery.dateRange = { date_from: "-90d" };
mainQuery.filterTestAccounts = true;
function verifyDefinition(actual, expected) {
  if (actual?.kind !== expected.kind || actual.filterTestAccounts !== true ||
      actual.dateRange?.date_from !== expected.dateRange.date_from ||
      !isDeepStrictEqual(actual.properties, expected.properties) ||
      !isDeepStrictEqual(actual.series, expected.series) ||
      !isDeepStrictEqual(actual.funnelsFilter, expected.funnelsFilter) ||
      !isDeepStrictEqual(actual.breakdownFilter, expected.breakdownFilter) ||
      !isDeepStrictEqual(actual.trendsFilter, expected.trendsFilter)) {
    throw new Error("Saved report definition changed: review before interpreting results");
  }
}
if (!configure) verifyDefinition(main.query.source, mainQuery);

const notes = "Prod, consentVersion=2026-10-15, trackingVersion=v1 ; hors tests (cohorte existante), UTC. Taux N/D sans entrant ; cohortes récentes immatures. Définitions : #507.";
const reports = [
  {
    name: "Okado — Conversion — Inscription vers publication",
    description: `${notes} Personnes uniques : signup_completed → campaign_published en 30 j. Inscriptions directes incluses, onboarding non obligatoire. Publication observée, historique manquant non reconstruit.`,
    query: funnel(["signup_completed", "campaign_published"], 30, "day"),
  },
  {
    name: "Okado — Conversion — Démo commencée vers confirmée",
    description: `${notes} Personnes uniques, début → fin en 30 min, pas tentatives. Valable après déploiement #507 ; historique du démarrage incomplet. Consentement en cours de parcours : séquence partielle possible.`,
    query: funnel(["marketing_demo_started", "marketing_demo_completed"], 30, "minute"),
  },
  {
    name: "Okado — Conversion — Pages vues consenties",
    description: `${notes} Vues (pas visiteurs) par page autorisée ; /other pour chemins sensibles/inconnus. Historique sans page non attribuable. Donnée enrichie après déploiement #507.`,
    query: { kind: "TrendsQuery", series: [{ kind: "EventsNode", event: "$pageview", math: "total" }], dateRange, properties: common, filterTestAccounts: true, interval: "day", breakdownFilter: { breakdowns: [{ property: "page", type: "event" }] }, trendsFilter: { display: "ActionsTable" } },
  },
  {
    name: "Okado — Conversion — CTA essai par source UTM",
    description: `${notes} Clics start_trial par utmSource du clic, pas inscriptions. UTM courants, aucun nouveau stockage. Source absente = non renseignée, pas forcément directe.`,
    query: { kind: "TrendsQuery", series: [{ kind: "EventsNode", event: "marketing_cta_clicked", math: "total", properties: [{ key: "cta", type: "event", operator: "exact", value: "start_trial" }] }], dateRange, properties: common, filterTestAccounts: true, interval: "day", breakdownFilter: { breakdowns: [{ property: "utmSource", type: "event" }] }, trendsFilter: { display: "ActionsTable" } },
  },
];

const snapshotAt = new Date().toISOString();
const startAt = new Date(Date.parse(snapshotAt) - 28 * 86400000).toISOString();
const catalog = await api("query/", "POST", { query: { kind: "HogQLQuery", query: "SELECT id, name, status, is_drifted FROM system.information_schema.metrics LIMIT 100" } });
if (catalog.results.length) throw new Error("Data catalog now contains metrics: review governed definitions before using this audit");

const run = async (query, observationDays = 28) => {
  const from = new Date(Date.parse(snapshotAt) - observationDays * 86400000).toISOString();
  const response = await api("query/", "POST", { query: { ...query, dateRange: { date_from: from, date_to: snapshotAt } } });
  return completedResults(response);
};
const countedEvents = ["$pageview", "marketing_cta_clicked", "marketing_demo_started", "marketing_demo_completed", "signup_started", "signup_completed", "onboarding_completed", "campaign_published"];
const counts = await run({ kind: "TrendsQuery", series: countedEvents.map((event) => ({ kind: "EventsNode", event, math: "total" })), properties: common, filterTestAccounts: true, interval: "day" });
const mainResult = await run(mainQuery, 90);

const links = [];
const reportResults = [];
// PostHog descriptions are capped at 400 characters. Full definitions stay in
// the versioned tracking/runbook documents; saved descriptions link to #507.
const shortDescription = (text) => {
  if (text.length > 400) throw new Error("Insight description exceeds 400 characters");
  return text;
};
if (configure) {
  await api(`insights/${main.id}/`, "PATCH", { description: shortDescription(`CTA start_trial → inscription commencée → compte créé → onboarding → publication, en 30 jours. ${notes}`), query: { kind: "InsightVizNode", source: mainQuery } });
}
for (const report of reports) {
  const matches = (await api(`insights/?search=${encodeURIComponent(report.name)}&limit=100`)).results.filter((item) => item.name === report.name && !item.deleted);
  if (matches.length > 1) throw new Error(`Duplicate managed insight: ${report.name}`);
  let saved = matches[0];
  if (configure) {
    // Validate the native query before saving, not a ratio of independent totals.
    await run(report.query, report.query.funnelsFilter?.funnelWindowIntervalUnit === "day" ? 90 : 28);
    const payload = { name: report.name, description: shortDescription(report.description), query: { kind: "InsightVizNode", source: report.query } };
    saved = saved ? await api(`insights/${saved.id}/`, "PATCH", payload) : await api("insights/", "POST", payload);
    const verified = await api(`insights/${saved.id}/`);
    verifyDefinition(verified.query?.source, report.query);
  } else if (saved) {
    const verified = await api(`insights/${saved.id}/`);
    verifyDefinition(verified.query?.source, report.query);
    const result = await run(verified.query.source, report.query.funnelsFilter?.funnelWindowIntervalUnit === "day" ? 90 : 28);
    if (!Array.isArray(result)) throw new Error("Incomplete saved insight result");
    reportResults.push({ name: report.name, ...(report.query.kind === "FunnelsQuery"
      ? { funnel: summarizeFunnel(report.query.series, result) }
      : { verified: true, seriesCount: result.length, breakdownValuesExported: false }) });
  } else {
    throw new Error(`Missing required insight: ${report.name}`);
  }
  links.push({ name: report.name, url: saved ? `${origin}/project/${projectId}/insights/${saved.short_id}` : null });
}
console.log(JSON.stringify({
  projectId, region: "EU", timezone: project.timezone, snapshotAt, startAt,
  definition: "Documented working definitions (#507); no governed catalog metric", configured: configure,
  totalEvents: summarizeEventCounts(countedEvents, counts),
  acquisitionFunnel: { url: `${origin}/project/${projectId}/insights/0gtandAv`, observationDays: 90, ...summarizeFunnel(mainQuery.series, mainResult) },
  reportResults,
  insights: links,
  caveats: ["Consenting traffic only; small immature cohorts", "No visitor, account, campaign or player records exported", "Pre-fix demo starts and page labels unavailable", "Internal exclusion uses the existing project cohort; it is not a guarantee that all internal activity is identified"],
}, null, 2));
