// Exercise the real library markup against emitted production CSS, without a
// development route, session, API call or database. Interactive paths are E2E-tested.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { registerHooks, createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const compiled = new URL(".next/static/", root);
const css = readdirSync(compiled, { recursive: true }).filter((name) => name.endsWith(".css"))
  .map((name) => readFileSync(new URL(name.replaceAll("\\", "/"), compiled), "utf8")).join("\n");
const sourceCss = readFileSync(new URL("src/components/merchant/wizard-prize-library.module.css", root), "utf8");
const styles = Object.fromEntries([...sourceCss.matchAll(/^\.(\w+)/gm)].map(([, key]) => {
  const token = css.match(new RegExp(`\\.([\\w-]*${key}[\\w-]*)[\\s:{.]`))?.[1];
  assert.ok(token, `Production CSS must include library style ${key}`);
  return [key, token];
}));
const require = createRequire(import.meta.url);
const reactUrl = pathToFileURL(require.resolve("react")).href;
registerHooks({
  resolve(name, context, next) {
    if (name === "@/components/ui/dialog") return {
      url: "data:text/javascript," + encodeURIComponent(`import {createElement} from ${JSON.stringify(reactUrl)};
        export function DialogShell({children,className,labelledBy,describedBy}) {
          return createElement('div',{className:'okado-dialog-overlay'},createElement('section',
            {role:'dialog',className:'okado-dialog-surface '+className,'aria-labelledby':labelledBy,'aria-describedby':describedBy},children));
        }`), shortCircuit: true,
    };
    return next(name, context);
  },
  load(url, context, next) {
    if (url.endsWith("wizard-prize-library.module.css")) return { format: "module", source: `export default ${JSON.stringify(styles)}`, shortCircuit: true };
    if (url.endsWith("wizard-prize-library.tsx")) return { format: "module", source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText, shortCircuit: true };
    return next(url, context);
  },
});
const { WizardPrizeLibrary } = await import("../src/components/merchant/wizard-prize-library.tsx");
const suggestions = Array.from({ length: 12 }, (_, index) => ({ id: String(index), label: `LOT ${index + 1}`, icon: "gift",
  description: "Valable avec une prestation payante, selon les disponibilités de l’établissement.", probability: 5, estimatedUnitCost: 4 }));
const props = {
  suggestions, activityLabel: "Beauté · Regard — cils & sourcils",
  addedIds: new Set(), remainingProbability: 100, isLoading: false, error: null, onRetry() {}, onAdd() {}, onClose() {},
};
const markup = renderToStaticMarkup(createElement(WizardPrizeLibrary, props));
const output = new URL("test-results/prize-library-production/", root);
mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.route("**/*", (route) => route.abort());
  for (const [width, height] of [[1280, 720], [1280, 600], [1894, 1040], [320, 600], [390, 740]]) {
    await page.setViewportSize({ width, height });
    await page.setContent(`<html><head><style>${css}</style></head><body>${markup}</body></html>`);
    const dialog = page.getByRole("dialog");
    const content = dialog.getByTestId("wizard-prize-library-content");
    const footer = dialog.getByRole("button", { name: "Terminer", exact: true });
    const close = dialog.getByRole("button", { name: "Fermer la bibliothèque de lots" });
    const bounds = await dialog.boundingBox();
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= height, `Contained at ${width}x${height}`);
    assert.equal(Math.round(bounds.width), width < 640 ? width : 960);
    assert.ok(await content.evaluate((node) => node.scrollHeight > node.clientHeight));
    const before = await footer.boundingBox();
    await content.evaluate((node) => { node.scrollTop = node.scrollHeight; });
    const after = await footer.boundingBox();
    const dismiss = await close.boundingBox();
    assert.equal(after.y, before.y, "Footer stays fixed while the catalog scrolls");
    assert.ok(after.y + after.height <= height && dismiss.y >= 0, "Actions stay in viewport");
    assert.ok(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 1));
    await page.screenshot({ path: fileURLToPath(new URL(`${width}x${height}.png`, output)) });
    console.log(`PASS compiled library layout ${width}x${height}`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const state of ["short", "empty", "error"]) {
    const shortMarkup = renderToStaticMarkup(createElement(WizardPrizeLibrary, {
      ...props, suggestions: state === "short" ? suggestions.slice(0, 1) : [], error: state === "error" ? "Suggestions indisponibles" : null,
    }));
    await page.setContent(`<html><head><style>${css}</style></head><body>${shortMarkup}</body></html>`);
    assert.ok((await page.getByRole("dialog").boundingBox()).height < 520, `Natural height for ${state}`);
    console.log(`PASS compiled library natural height ${state}`);
  }
} finally {
  await browser.close();
}
