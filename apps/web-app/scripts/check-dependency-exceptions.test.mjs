import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("./check-dependency-exceptions.mjs", import.meta.url), "utf8")
  .replace(/^import .*;\r?$/gm, "");
const clean = { vulnerabilities: {}, metadata: { vulnerabilities: { total: 0 } } };
function run({ audit = clean, status = 0, web = "16.4.6", landing = "16.4.6", eslint = "16.4.6", raw, includeDevelopment = false, platform = "linux", currentDate = "2026-11-18" } = {}) {
  const output = [];
  let code = 0;
  class Exit extends Error {}
  try {
    vm.runInNewContext(source, {
      path,
      Date: class extends Date { constructor() { super(`${currentDate}T12:00:00Z`); } },
      fs: { readFileSync(file) {
        return JSON.stringify({ dependencies: { next: file.includes("landing-page") ? landing : web },
          devDependencies: { "eslint-config-next": eslint } });
      } },
      spawnSync: (_command, args) => {
        assert.equal(args.join(" ").includes("--omit=dev"), !includeDevelopment);
        return { stdout: raw ?? JSON.stringify(audit), status };
      },
      console: { log: (...args) => output.push(args.join(" ")), error: (...args) => output.push(args.join(" ")) },
      process: { cwd: () => path.resolve("apps/web-app"), platform, env: {}, argv: includeDevelopment ? ["node", "guard", "--include-dev"] : [],
        exit(value) { code = value; throw new Exit(); } },
    });
  } catch (error) { if (!(error instanceof Exit)) throw error; }
  return { code, output: output.join("\n") };
}

test("audit propre et Next/ESLint corrigés sur les deux applications", () => {
  assert.equal(run().code, 0);
  assert.match(run().output, /16\.4\.6.*deux applications/);
});

test("audit complet autorise uniquement lavis faible shadcn documente", () => {
  for (const platform of ["linux", "win32"]) {
    const options = { includeDevelopment: true, platform };
    const reviewed = { vulnerabilities: { "@shadcn/registry": { severity: "low" }, deepmerge: { severity: "low", via: [{ url: "https://github.com/advisories/GHSA-gcqx-w48m-w2h4" }] }, shadcn: { severity: "low" } }, metadata: { vulnerabilities: { total: 3 } } };
    assert.equal(run({ ...options, audit: reviewed, status: 1 }).code, 0);
    assert.equal(run(options).code, 0);
    assert.match(run(options).output, /complet.*développement/);
    assert.equal(run({ ...options, audit: { vulnerabilities: { zod: { severity: "high" } }, metadata: { vulnerabilities: { total: 1 } } }, status: 1 }).code, 1);
    assert.equal(run({ ...options, audit: { error: { code: "NETWORK" } }, status: 1 }).code, 1);
    assert.equal(run({ ...options, raw: "not-json" }).code, 1);
    assert.equal(run({ ...options, audit: {} }).code, 1);
    assert.equal(run({ ...options, eslint: "16.4.1" }).code, 1);
  }
});
test("exception temporaire autorise uniquement l'empreinte picomatch de développement documentée", () => {
  const names = ["@dotenvx/dotenvx", "@next/eslint-plugin-next", "@shadcn/registry", "@ts-morph/common",
    "@typescript-eslint/eslint-plugin", "@typescript-eslint/parser", "@typescript-eslint/type-utils",
    "@typescript-eslint/typescript-estree", "@typescript-eslint/utils", "eslint-config-next",
    "eslint-import-resolver-typescript", "fast-glob", "fdir", "micromatch", "picomatch", "shadcn",
    "tinyglobby", "ts-morph", "typescript-eslint"];
  const vulnerabilities = Object.fromEntries(names.map((name) => [name, {
    severity: "high",
    via: name === "picomatch" ? [{ url: "https://github.com/advisories/GHSA-fc5q-39xc-vjpf", range: "<=4.0.7" }] : ["picomatch"],
  }]));
  const audit = { vulnerabilities, metadata: { vulnerabilities: { total: 19, high: 19, moderate: 0, low: 0, critical: 0 } } };
  const options = { includeDevelopment: true, audit, status: 1 };
  assert.equal(run(options).code, 0);
  assert.match(run(options).output, /GHSA-fc5q-39xc-vjpf.*2026-12-02/);
  assert.equal(run({ ...options, includeDevelopment: false }).code, 1);
  assert.equal(run({ ...options, currentDate: "2026-12-03" }).code, 1);
  assert.equal(run({ ...options, audit: { ...audit, vulnerabilities: { ...vulnerabilities, unrelated: { severity: "high" } }, metadata: { vulnerabilities: { total: 20, high: 20, moderate: 0, low: 0, critical: 0 } } } }).code, 1);
  assert.equal(run({ ...options, audit: { ...audit, vulnerabilities: { ...vulnerabilities, picomatch: { ...vulnerabilities.picomatch, via: [...vulnerabilities.picomatch.via, { url: "https://github.com/advisories/OTHER" }] } } } }).code, 1);
  assert.equal(run({ ...options, audit: { ...audit, vulnerabilities: { ...vulnerabilities, picomatch: { ...vulnerabilities.picomatch, severity: "critical" } } } }).code, 1);
  assert.equal(run({ ...options, audit: { ...audit, metadata: { vulnerabilities: { total: 19, high: 18, moderate: 1, low: 0, critical: 0 } } } }).code, 1);
});
test("ancienne version SaaS refusée même si le registre ne signale rien", () => {
  assert.equal(run({ web: "16.3.8" }).code, 1);
});
test("ancienne version landing ou désalignement refusé", () => {
  assert.equal(run({ landing: "16.3.8" }).code, 1);
  assert.equal(run({ landing: "16.4.1" }).code, 1);
});
test("configuration ESLint désalignée refusée", () => {
  assert.equal(run({ eslint: "16.3.6" }).code, 1);
});
test("aucune vulnérabilité n'est ignorée, même avec un total incohérent", () => {
  assert.equal(run({ audit: { ...clean, vulnerabilities: { next: { severity: "high" } } } }).code, 1);
  assert.equal(run({ audit: { vulnerabilities: {}, metadata: { vulnerabilities: { total: 1 } } } }).code, 1);
});
test("échec registre et code de sortie non nul : jamais de faux succès", () => {
  assert.equal(run({ audit: { error: { code: "NETWORK" } }, status: 1 }).code, 1);
  assert.equal(run({ status: 1 }).code, 1);
});
test("JSON invalide refusé", () => {
  assert.equal(run({ raw: "bad JSON" }).code, 1);
});
test("rapport incomplet refusé", () => {
  for (const audit of [{}, { vulnerabilities: {} }, { metadata: { vulnerabilities: { total: 0 } } }]) {
    assert.equal(run({ audit }).code, 1);
  }
});
