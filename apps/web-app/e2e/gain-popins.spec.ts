import { expect, test } from "@playwright/test";

// Uses the existing Maison Sora fixture in an isolated memory-backed test server.
// All participation writes are intercepted: no contact, stock or e-mail is changed.
for (const isPreview of [false, true]) {
  for (const hasConditions of [true, false]) {
    for (const gameType of ["wheel", "scratch"]) {
    test(`gain reception and QR confirmation (${gameType}, ${isPreview ? "preview" : "public"}, ${hasConditions ? "with" : "without"} conditions)`, async ({ page }, testInfo) => {
      const campaignId = gameType === "wheel" ? "camp-sora-social" : "camp-sora-review";
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const conditions = "Valable sur une prestation de 30 € minimum.\nNon cumulable avec une autre offre.";
      const prize = {
        id: "prize-gain-popin",
        label: "-10% PROCHAINE VISITE",
        purchaseRequired: hasConditions,
        usageConditions: hasConditions ? conditions : "",
      };
      let sessionPreviewToken: unknown;
      let finalizedPayload: Record<string, unknown> | undefined;
      await page.route("**/api/public/event", (route) => route.fulfill({ json: {} }));
      await page.route("**/api/public/draw/session", (route) => {
        sessionPreviewToken = route.request().postDataJSON().previewToken;
        return route.fulfill({ json: {
          session: {
            id: "session-gain-popin",
            campaignId,
            status: "pending",
            isPreview,
            previewSessionToken: isPreview ? "test-preview-session" : undefined,
          },
          prize,
        } });
      });
      await page.route("**/api/public/draw/finalize", (route) => {
        finalizedPayload = route.request().postDataJSON();
        return route.fulfill({ json: {
          prize,
          lead: {
            redemptionCode: "E2E-GAIN-449",
            rewardAvailableAt: "2026-10-04T12:00:00.000Z",
            rewardExpiresAt: "2026-11-04T12:00:00.000Z",
          },
          campaign: { actions: [] },
        } });
      });
      await page.goto(`/campaign/${campaignId}${isPreview ? "?preview=1" : ""}`);
      await page.getByRole("button", { name: gameType === "wheel" ? "JOUER" : "Je participe", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Jouer maintenant", exact: true }).click();

      if (gameType === "scratch") {
        const canvas = page.locator("canvas");
        await canvas.scrollIntoViewIfNeeded();
        const box = await canvas.boundingBox();
        expect(box).not.toBeNull();
        for (let y = 15; y < box!.height; y += 22) {
          if (await page.getByRole("button", { name: "Recevoir mon gain", exact: true }).isVisible()) break;
          await page.mouse.move(box!.x + 10, box!.y + y);
          await page.mouse.down();
          await page.mouse.move(box!.x + box!.width - 10, box!.y + y, { steps: 24 });
          await page.mouse.up();
        }
      }

      const dialog = page.getByRole("dialog");
      const receive = dialog.getByRole("button", { name: "Recevoir mon gain", exact: true });
      await expect(receive).toBeVisible({ timeout: 15_000 });
      await expect(receive).toHaveCSS("font-size", "20px");
      await expect(receive).toHaveCSS("font-weight", "700");
      await expect(receive).toHaveCSS("line-height", "28px");
      await expect(dialog.getByRole("checkbox")).not.toBeChecked();
      const usage = dialog.getByText(conditions, { exact: true });
      if (hasConditions) {
        await expect(usage).toBeVisible();
        const buttonBox = await receive.boundingBox();
        const conditionsBox = await usage.boundingBox();
        expect(conditionsBox!.y).toBeGreaterThan(buttonBox!.y + buttonBox!.height);
      } else {
        await expect(dialog.getByText("Conditions d'utilisation", { exact: true })).toHaveCount(0);
      }
      await dialog.getByPlaceholder("Prénom", { exact: true }).fill("Test");
      await dialog.getByPlaceholder("E-mail", { exact: true }).fill("e2e@okado.app");
      await page.screenshot({ path: testInfo.outputPath("receive-gain-mobile.png") });
      await receive.click();
      await expect(dialog.getByText("Votre gain est confirmé. Cliquez sur suivant pour afficher les informations de retrait.", { exact: true })).toBeVisible();
      await dialog.getByRole("button", { name: "Suivant", exact: true }).click();
      await expect(dialog.getByRole("heading", { name: "Votre gain est confirmé !", exact: true })).toBeVisible();
      await expect(dialog.getByText("Vous allez recevoir votre gain par e-mail (vérifiez vos spams).", { exact: true })).toBeVisible();
      await expect(dialog.getByText(/Conservez.*ce QR code/)).toHaveCount(0);
      const dates = dialog.getByText("Vous avez entre le 04/10/2026 et le 04/11/2026 pour venir le récupérer.", { exact: true });
      await expect(dates).toBeVisible();
      const dateBlock = dates.locator("..");
      if (hasConditions) {
        await expect(dateBlock.getByText("Le retrait du lot est soumis à une condition d’achat.", { exact: true })).toBeVisible();
        await expect(dateBlock.getByText(conditions, { exact: true })).toBeVisible();
      } else {
        await expect(dialog.getByText(/condition d’achat|Conditions d'utilisation/)).toHaveCount(0);
      }
      const qr = dialog.getByRole("img", { name: "QR code E2E-GAIN-449", exact: true });
      await expect(qr).toBeVisible();
      await expect.poll(() => qr.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
      const save = dialog.getByRole("link", { name: "Enregistrer mon QR code", exact: true });
      await expect(save).toHaveAttribute("href", "/api/public/redeem/E2E-GAIN-449/qr");
      await expect(save).toHaveAttribute("download", "qr-lot-E2E-GAIN-449.svg");
      const qrBox = await qr.boundingBox();
      const saveBox = await save.boundingBox();
      expect(saveBox!.y).toBeGreaterThan(qrBox!.y + qrBox!.height);
      await expect(dialog.getByText("Présentez ce QR code lors de votre rendez-vous.", { exact: true })).toBeVisible();
      await expect(dialog.getByText("Code de retrait : E2E-GAIN-449", { exact: true })).toHaveCSS("font-size", "12px");
      await expect(dialog.getByText(/Conservez ce QR code pour retirer|Enregistrez-le pour le retrouver/)).toHaveCount(0);
      expect(finalizedPayload).toMatchObject({ sessionId: "session-gain-popin", marketingConsent: false });
      if (isPreview) {
        expect(sessionPreviewToken).toBeTruthy();
        expect(finalizedPayload?.previewSessionToken).toBe("test-preview-session");
        await expect(dialog.getByText(/Résultat simulé/)).toBeVisible();
      } else {
        expect(sessionPreviewToken).toBeNull();
      }
      await page.screenshot({ path: testInfo.outputPath("confirmed-gain-mobile.png") });
      await page.setViewportSize({ width: 320, height: 568 });
      await save.scrollIntoViewIfNeeded();
      await expect(save).toBeVisible();
      expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      const downloadEvent = page.waitForEvent("download");
      await save.click();
      expect((await downloadEvent).suggestedFilename()).toBe("qr-lot-E2E-GAIN-449.svg");
    });
    }
  }
}
