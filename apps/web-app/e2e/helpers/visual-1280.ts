import { expect, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import { ANALYTICS_CONSENT_COOKIE, ANALYTICS_CONSENT_VERSION } from "../../src/lib/analytics-consent";

/** Layout tests exercise the post-choice screen; consent itself has its own suite. */
export async function rejectAnalyticsForVisualTests(context: BrowserContext, baseURL: string) {
  await context.addCookies([{ name: ANALYTICS_CONSENT_COOKIE, url: baseURL,
    value: encodeURIComponent(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION,
      choice: "rejected", decidedAt: Date.now() })) }]);
}

/** Required desktop check for any new/changed screen; attach viewport captures
 * for human inspection, not an automatically approved pixel baseline. */
export async function captureVisualAt1280(page: Page, info: TestInfo, name: string, height = 720) {
  await page.setViewportSize({ width: 1280, height });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  await assertNoPageOverflow(page);
  const path = info.outputPath(`${name}-1280x${height}.png`);
  await page.screenshot({ path, fullPage: false, animations: "disabled" });
  await info.attach(`${name} — 1280×${height}`, { path, contentType: "image/png" });
}

export async function assertNoPageOverflow(page: Page) {
  const overflow = await page.evaluate(() => [document.documentElement, document.body,
    ...document.querySelectorAll<HTMLElement>(".okado-workspace-shell main")]
    .filter((node) => node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 1)
    .map((node) => ({ tag: node.tagName, class: node.className, width: node.clientWidth, scroll: node.scrollWidth })));
  expect(overflow, "No horizontal page/form overflow; scrollable tables may remain inside their own containers").toEqual([]);
}
