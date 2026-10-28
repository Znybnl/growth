import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.cwd(), "../..");
const includeDevelopment = process.argv?.includes("--include-dev") ?? false;
const patchedVersion = "16.4.2";
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
if (result.status !== 0 || audit.error || !audit.metadata?.vulnerabilities ||
    !Number.isInteger(audit.metadata.vulnerabilities.total) ||
    !audit.vulnerabilities || typeof audit.vulnerabilities !== "object" || Array.isArray(audit.vulnerabilities)) {
  console.error("Échec : audit indisponible, incomplet ou signalant des vulnérabilités.");
  process.exit(1);
}

const vulnerabilities = audit.vulnerabilities;
const names = Object.keys(vulnerabilities).sort();
const allowedNames = [];
const unexpectedNames = names.filter((name) => !allowedNames.includes(name));
const total = audit.metadata?.vulnerabilities?.total ?? names.length;
const frameworksAreAligned = packages.every(({ next, eslint }) => next === patchedVersion && eslint === patchedVersion);

if (
  unexpectedNames.length ||
  total !== 0 ||
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
  `OK - Aucun avis npm audit ${includeDevelopment ? "complet (production et développement)" : "de production"} détecté ; Next.js et ESLint ${patchedVersion} alignés sur les deux applications.`,
);
