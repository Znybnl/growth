import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import ts from "typescript";

const mocks = {
  "@/lib/auth": "export const requireAuthenticatedSession = async () => { if (!globalThis.__lastLogin.session) throw new Error('login-required'); return globalThis.__lastLogin.session; };",
  "@/lib/admin": "export const isSaasAdminEmail = email => email === 'admin@example.test';",
  "@/lib/admin-repository": "export const getSaasAdminOverview = async q => { globalThis.__lastLogin.calls.push(q); return {users:[]}; };",
  "@/components/merchant/admin-dashboard": "export const AdminDashboard = () => null;",
  "next/navigation": "export const redirect = () => {throw new Error('redirect');};",
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true };
    return nextResolve(specifier, context.parentURL?.startsWith("data:") ? { ...context, parentURL: import.meta.url } : context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".tsx")) return { format: "module", shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(url), "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext } }).outputText };
    return nextLoad(url, context);
  },
});
const { default: Page } = await import("../app/(merchant)/admin/page.tsx");
test("anonymous and merchant requests cannot trigger the overview/Auth reader", async () => {
  for (const session of [null, { user: { email: "merchant@example.test" } }]) {
    globalThis.__lastLogin = { session, calls: [] };
    await assert.rejects(Page({ searchParams: Promise.resolve({}) }));
    assert.deepEqual(globalThis.__lastLogin.calls, []);
  }
});
test("administrator keeps search and receives projected overview", async () => {
  globalThis.__lastLogin = { session: { user: { email: "admin@example.test" } }, calls: [] };
  const page = await Page({ searchParams: Promise.resolve({ q: " demo " }) });
  assert.deepEqual(globalThis.__lastLogin.calls, ["demo"]);
  assert.deepEqual(page.props.overview, { users: [] });
});
