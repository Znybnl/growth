import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("./check-dependency-exceptions.mjs", import.meta.url), "utf8")
  .replace(/^import .*;\r?$/gm, "");
const clean = { vulnerabilities: {}, metadata: { vulnerabilities: { total: 0 } } };
function run({ audit = clean, status = 0, web = "16.4.2", landing = "16.4.2", eslint = "16.4.2", raw, includeDevelopment = false, platform = "linux" } = {}) {
  const output = [];
  let code = 0;
  class Exit extends Error {}
  try {
    vm.runInNewContext(source, {
      path,
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
  assert.match(run().output, /16\.4\.2.*deux applications/);
});

test("audit complet couvre le développement sur Linux et Windows sans exception", () => {
  for (const platform of ["linux", "win32"]) {
    const options = { includeDevelopment: true, platform };
    assert.equal(run(options).code, 0);
    assert.match(run(options).output, /complet.*développement/);
    assert.equal(run({ ...options, audit: { vulnerabilities: { zod: { severity: "high" } }, metadata: { vulnerabilities: { total: 1 } } }, status: 1 }).code, 1);
    assert.equal(run({ ...options, audit: { error: { code: "NETWORK" } }, status: 1 }).code, 1);
    assert.equal(run({ ...options, raw: "not-json" }).code, 1);
    assert.equal(run({ ...options, audit: {} }).code, 1);
    assert.equal(run({ ...options, eslint: "16.4.1" }).code, 1);
  }
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
