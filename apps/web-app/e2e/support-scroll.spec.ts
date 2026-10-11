import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 320, height: 720 },
  { width: 390, height: 720 },
  { width: 1280, height: 720 },
  { width: 1536, height: 540 },
]) {
  test(`Supervision : un seul défilement vertical dans le cadre marchand à ${viewport.width}×${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    // The fixture uses only synthetic data. Never call a real mutation or send mail.
    await page.route("**/api/**", route => route.fulfill({ json: { emailCount: 0 } }));
    await page.goto("/dev/support-monitoring?shell=1");
    await expect(page.getByRole("table")).toHaveCount(4);
    const main = page.getByRole("main");
    const assertSingleScroll = async () => {
      const geometry = await page.evaluate(() => {
        const root = document.documentElement;
        const vertical = [...document.querySelectorAll<HTMLElement>("*")].filter(element =>
          /auto|scroll/.test(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight + 1);
        return {
          documentOverflowsY: root.scrollHeight > root.clientHeight + 1,
          documentOverflowsX: root.scrollWidth > root.clientWidth + 1,
          vertical: vertical.map(element => element.tagName),
          captionsContained: [...document.querySelectorAll<HTMLTableCaptionElement>("caption")].every(caption =>
            caption.offsetParent === caption.closest('[role="region"]')),
          windowScrollY: window.scrollY,
        };
      });
      expect(geometry).toEqual({ documentOverflowsY: false, documentOverflowsX: false,
        vertical: ["MAIN"], captionsContained: true, windowScrollY: 0 });
    };
    await assertSingleScroll();
    await page.screenshot({ path: testInfo.outputPath("supervision-top.png") });

    const emails = page.getByRole("region", { name: "Tableau E-mails", exact: true });
    await emails.scrollIntoViewIfNeeded();
    if (viewport.width < 1400) {
      await emails.focus();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => emails.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
      await emails.evaluate(element => { element.scrollLeft = 0; });
    }
    await page.getByText("Voir l’erreur complète", { exact: true }).click();
    await assertSingleScroll();
    await page.getByText("Voir l’erreur complète", { exact: true }).click();

    // Scroll the application, not the document. The last section must remain reachable.
    await main.hover();
    await page.mouse.wheel(0, 10000);
    await expect.poll(() => main.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    await expect(page.getByRole("button", { name: "Synchroniser Brevo" })).toBeInViewport();
    await expect(page.getByRole("region", { name: "Tableau Journal", exact: true })).toBeVisible();
    await assertSingleScroll();
    await page.screenshot({ path: testInfo.outputPath("supervision-bottom.png") });
    expect(errors).toEqual([]);
  });
}
