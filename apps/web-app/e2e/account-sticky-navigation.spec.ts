import { expect, test } from "@playwright/test";
import { assertNoPageOverflow, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";

for (const viewport of [{ width: 1280, height: 720 }, { width: 1280, height: 600 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
  test(`@visual-1280 Mon compte : navigation stable au défilement ${viewport.width}x${viewport.height}`, async ({ page, context, baseURL }, info) => {
    await page.setViewportSize(viewport);
    await rejectAnalyticsForVisualTests(context, baseURL!);
    await page.route(/https:\/\//, route => route.abort());
    await page.route("**/api/**", route => route.fulfill({ json: { frequencies: [], enabled: false, days: 7, canEdit: true, updatedAt: null, counters: {}, items: [] } }));
    await page.goto("/dev/affiliate-accounts?mode=account&enabled=1");
    const main = page.getByRole("main");
    const tabs = page.getByRole("tablist", { name: "Sections du compte" });
    const toolbar = page.locator(".okado-account-toolbar");
    const save = toolbar.getByRole("button", { name: "Enregistrer", exact: true });
    await expect(tabs).toBeVisible();
    for (const tab of await tabs.getByRole("tab").all()) await expect(tab).toBeInViewport({ ratio: 1 });
    await expect(save).toBeInViewport();
    await page.screenshot({ path: info.outputPath(`account-initial-${viewport.width}x${viewport.height}.png`) });
    await page.evaluate(() => document.fonts.ready);
    for (const position of [500, 900, 100000]) {
      await main.evaluate((node, top) => { node.scrollTop = top; }, position);
      await expect.poll(async () => {
        const [nav, root] = await Promise.all([tabs.boundingBox(), main.boundingBox()]);
        return nav!.y - root!.y;
      }).toBeGreaterThanOrEqual(0);
      const [nav, root] = await Promise.all([tabs.boundingBox(), main.boundingBox()]);
      expect(nav!.y - root!.y).toBeLessThan(12);
      await expect(tabs.getByRole("tab", { name: "Utilisateur", exact: true })).toBeInViewport();
      await expect(save).toBeInViewport();
      const [button, navBounds] = await Promise.all([save.boundingBox(), tabs.boundingBox()]);
      expect(button!.x >= navBounds!.x + navBounds!.width || button!.y >= navBounds!.y + navBounds!.height).toBe(true);
    }
    await assertNoPageOverflow(page);
    await page.screenshot({ path: info.outputPath(`account-scrolled-${viewport.width}x${viewport.height}.png`) });
    await tabs.getByRole("tab", { name: "Utilisateur", exact: true }).click();
    await page.getByLabel("Prénom").fill("Camille modifiée");
    await main.evaluate(node => { node.scrollTop = node.scrollHeight; });
    await tabs.getByRole("tab", { name: "Abonnement", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Changer de section ?", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    const request = page.waitForRequest(r => r.url().endsWith("/api/account") && r.method() === "POST");
    await save.click();
    expect((await request).postDataJSON().firstName).toBe("Camille modifiée");
    await expect(page.getByRole("heading", { name: "Modifications enregistrées", exact: true })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Fermer", exact: true }).click();
    await tabs.getByRole("tab", { name: "Utilisateur", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.getByRole("tab", { name: "Abonnement", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toBeInViewport();
    await assertNoPageOverflow(page);
  });
}
