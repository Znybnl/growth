import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.cwd(), "../..");
const webPackagePath = path.join(process.cwd(), "package.json");
const webPackage = JSON.parse(fs.readFileSync(webPackagePath, "utf8"));
const command = process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : "npm";
const args =
  process.platform === "win32"
    ? ["/d", "/s", "/c", "npm audit --omit=dev --json"]
    : ["audit", "--omit=dev", "--json"];
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

const vulnerabilities = audit.vulnerabilities ?? {};
const names = Object.keys(vulnerabilities).sort();
const allowedNames = [];
const unexpectedNames = names.filter((name) => !allowedNames.includes(name));
const total = audit.metadata?.vulnerabilities?.total ?? names.length;
const nextVersion = webPackage.dependencies?.next;
const nextIsPinnedToPatchedRelease = nextVersion === "16.3.3";

if (
  unexpectedNames.length ||
  total !== 0 ||
  !nextIsPinnedToPatchedRelease ||
  vulnerabilities.next ||
  vulnerabilities.postcss ||
  vulnerabilities.sharp
) {
  console.error("Échec : l’audit dépasse l’exception documentée.");
  console.error(JSON.stringify({ names, total, nextVersion }, null, 2));
  process.exit(1);
}

console.log(
  "OK - Aucun avis npm audit de production détecté avec Next.js 16.3.3.",
);
