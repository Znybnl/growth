import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.cwd(), "../..");
const includeDevelopment = process.argv?.includes("--include-dev") ?? false;
const patchedVersion = "16.4.6";
const picomatchExceptionReviewBy = "2026-12-02";
const packages = ["web-app", "landing-page"].map((name) => {
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "apps", name, "package.json"), "utf8"));
  return { name, next: manifest.dependencies?.next, eslint: manifest.devDependencies?.["eslint-config-next"] };
});
const command = process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : "npm";
const args =
  process.platform === "win32"
    ? ["/d", "/s", "/c", `npm audit ${includeDevelopment ? "" : "--omit=dev "}--json`]
    : ["audit", ...(includeDevelopment ? [] : ["--omit=dev"]), "--json"];
const result = spawnSync(command, args, {
  cwd: repoRoot,
  encoding: "utf8",
  windowsHide: true,
});

let audit;
try {
  audit = JSON.parse(result.stdout);
} catch {
  console.error("Impossible de lire la sortie JSON de npm audit.");
  if (result.stderr) console.error(result.stderr.trim());
  process.exit(1);
}

// Fail closed: an unavailable registry or incomplete report is not a clean audit.
if (audit.error || !audit.metadata?.vulnerabilities ||
    !Number.isInteger(audit.metadata.vulnerabilities.total) ||
    !audit.vulnerabilities || typeof audit.vulnerabilities !== "object" || Array.isArray(audit.vulnerabilities)) {
  console.error("Échec : audit indisponible, incomplet ou signalant des vulnérabilités.");
  process.exit(1);
}

const vulnerabilities = audit.vulnerabilities;
const names = Object.keys(vulnerabilities).sort();
const developmentExceptionNames = ["@shadcn/registry", "deepmerge", "shadcn"];
const picomatchExceptionNames = [
  "@dotenvx/dotenvx", "@next/eslint-plugin-next", "@shadcn/registry", "@ts-morph/common",
  "@typescript-eslint/eslint-plugin", "@typescript-eslint/parser", "@typescript-eslint/type-utils",
  "@typescript-eslint/typescript-estree", "@typescript-eslint/utils", "eslint-config-next",
  "eslint-import-resolver-typescript", "fast-glob", "fdir", "micromatch", "picomatch",
  "shadcn", "tinyglobby", "ts-morph", "typescript-eslint",
].sort();
const reviewedLowDevelopmentException = includeDevelopment &&
  names.length === developmentExceptionNames.length &&
  names.every((name) => developmentExceptionNames.includes(name)) &&
  Object.values(vulnerabilities).every(({ severity }) => severity === "low") &&
  vulnerabilities.deepmerge?.via?.some((advisory) => advisory.url === "https://github.com/advisories/GHSA-gcqx-w48m-w2h4");
const picomatchAdvisories = Object.entries(vulnerabilities).flatMap(([name, vulnerability]) =>
  (vulnerability.via ?? []).filter((advisory) => typeof advisory === "object").map((advisory) => ({ name, advisory })),
);
const counts = audit.metadata.vulnerabilities;
const reviewedPicomatchException = includeDevelopment &&
  new Date().toISOString().slice(0, 10) <= picomatchExceptionReviewBy &&
  names.length === picomatchExceptionNames.length &&
  names.every((name, index) => name === picomatchExceptionNames[index]) &&
  Object.values(vulnerabilities).every(({ severity }) => severity === "high") &&
  counts.total === 19 && counts.high === 19 && counts.moderate === 0 && counts.low === 0 && counts.critical === 0 &&
  picomatchAdvisories.length === 1 && picomatchAdvisories[0].name === "picomatch" &&
  picomatchAdvisories[0].advisory.url === "https://github.com/advisories/GHSA-fc5q-39xc-vjpf" &&
  picomatchAdvisories[0].advisory.range === "<=4.0.7";
const reviewedDevelopmentException = reviewedLowDevelopmentException || reviewedPicomatchException;
const allowedNames = reviewedLowDevelopmentException
  ? developmentExceptionNames
  : reviewedPicomatchException ? picomatchExceptionNames : [];
const unexpectedNames = names.filter((name) => !allowedNames.includes(name));
const total = audit.metadata?.vulnerabilities?.total ?? names.length;
const frameworksAreAligned = packages.every(({ next, eslint }) => next === patchedVersion && eslint === patchedVersion);

if (
  (result.status !== 0 && !reviewedDevelopmentException) ||
  unexpectedNames.length ||
  total !== (reviewedLowDevelopmentException ? developmentExceptionNames.length : reviewedPicomatchException ? picomatchExceptionNames.length : 0) ||
  !frameworksAreAligned ||
  vulnerabilities.next ||
  vulnerabilities.postcss ||
  vulnerabilities.sharp
) {
  console.error("Échec : l’audit dépasse l’exception documentée.");
  console.error(JSON.stringify({ names, total, packages }, null, 2));
  process.exit(1);
}

console.log(
  `OK - Audit ${includeDevelopment ? "complet (production et développement)" : "de production"} ; Next.js et ESLint ${patchedVersion} alignés sur les deux applications.${reviewedLowDevelopmentException ? " Exception documentée : un avis faible dans shadcn de développement." : ""}${reviewedPicomatchException ? ` Exception temporaire : GHSA-fc5q-39xc-vjpf uniquement dans les dépendances de développement, à réexaminer avant le ${picomatchExceptionReviewBy}.` : ""}`,
);
