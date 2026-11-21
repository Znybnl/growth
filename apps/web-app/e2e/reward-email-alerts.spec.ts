import { expect, test } from "@playwright/test";

for (const width of [390, 1280]) {
  test(`consultation et détails de l’e-mail à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    let count = 2;
    let ack: unknown;
    await page.route("**/api/merchant/email-alerts", async route => {
      if (route.request().method() === "POST") {
        ack = route.request().postDataJSON(); count = 1;
        await route.fulfill({ json: { ok: true } }); return;
      }
      await route.fulfill({ json: { emailCount: count, emailCampaignId: "demo", emailSnapshot: [{ id:"d1", status:"bounced", eventAt:null }], lowStockCount:0, exhaustedStockCount:0, stockCampaignId:null } });
    });
    await page.goto("/dev/reward-email-alerts");
    const message = page.getByRole("button", { name: /The recipient's email provider/ });
    await message.click();
    await expect(page.getByRole("tooltip")).toContainText("negative impact on your reputation as a sender.");
    await message.press("Escape");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    const resend = page.getByRole("button", { name: "Renvoyer e-mail" });
    await expect(resend.nth(0)).toBeDisabled();
    await expect(resend.nth(1)).toBeEnabled();
    await expect(page.getByText(/rejet permanent/)).toBeVisible();
    if (width < 1024) await page.getByRole("button", { name: /menu/i }).first().click();
    const alert = page.getByRole("link", { name: /2 e-mails de gain à vérifier/ });
    await expect(alert).toBeVisible();
    const colors = await alert.evaluate(el => ({ color: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor }));
    const luminance = (color: string) => color.match(/\d+/g)!.slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const values = [luminance(colors.color), luminance(colors.background)].sort((a, b) => a - b);
    expect((values[1] + .05) / (values[0] + .05)).toBeGreaterThanOrEqual(4.5);
    await alert.click();
    await expect.poll(() => ack).toMatchObject({ campaignId:"demo", snapshot:[{id:"d1",status:"bounced",eventAt:null}] });
    await expect(page).toHaveURL(/\/data\?campaign=demo&emailStatus=attention/);
    await page.goto("/dev/reward-email-alerts");
    if (width < 1024) await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await expect(page.getByRole("link", { name: "1 e-mail de gain à vérifier" })).toBeVisible();
  });
}
