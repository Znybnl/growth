import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync } from "node:fs";
import { APPLICATION_ANALYTICS_PAGES, safeApplicationAnalyticsPage } from "./analytics-routes.ts";

function pages(directory, parts = []) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory()) return !parts.length && entry.name === "dev" ? [] : pages(new URL(`${entry.name}/`, directory), [...parts, entry.name]);
    return entry.name === "page.tsx" ? ["/" + parts.filter(part => !part.startsWith("(")).join("/")] : [];
  });
}

test("every application page family is explicitly classified; future untracked pages fail CI", () => {
  assert.deepEqual([...APPLICATION_ANALYTICS_PAGES].sort(), pages(new URL("../app/", import.meta.url)).sort());
});
test("dynamic campaign/redemption identifiers become placeholders, never raw segments", () => {
  for (const template of APPLICATION_ANALYTICS_PAGES) {
    const path = template.replace(/\[(id|code)\]/g, "private-code@example.test");
    assert.equal(safeApplicationAnalyticsPage(path), template);
    assert.equal(safeApplicationAnalyticsPage(path + "?email=private"), undefined);
    assert.equal(safeApplicationAnalyticsPage(path + "#private"), undefined);
  }
  for (const path of ["/unknown", "/campaign", "/campaign/", "/campaign/id/more", "/api/private", "/dev/fixture", "/account/private", "/admin/campaigns/id/edit/private"]) {
    assert.equal(safeApplicationAnalyticsPage(path), undefined);
  }
});
