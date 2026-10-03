import { expect, test, type Page } from "@playwright/test";

async function enablePreGameCapture(page: Page, campaignId: string) {
  // Chromium treats fulfilled documents as network-unknown. Allow this
  // local fixture to load its own scripts and HMR without changing app security.
  const baseURL = test.info().project.use.baseURL;
  if (
    baseURL &&
    ["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)
  ) {
    await page.context().grantPermissions(["local-network-access"], {
      origin: new URL(baseURL).origin,
    });
  }
  // Change only the fixture's serialized initial prop; no campaign is saved.
  await page.route(`**/campaign/${campaignId}*`, async (route) => {
    if (route.request().resourceType() !== "document") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const original = await response.text();
    const body = original.replaceAll(
      /(\\*"emailCaptureEnabled\\*":)false/g,
      // Preserve RSC text-record lengths while changing the JSON boolean.
      "$1true ",
    );
    expect(body).not.toBe(original);
    await route.fulfill({ response, body });
  });
}

async function revealScratch(page: Page) {
  // Session preparation remounts the ticket; do not grab the idle canvas.
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  for (let y = 15; y < box!.height; y += 22) {
    if (await page.getByRole("dialog").getByRole("heading").isVisible()) break;
    await page.mouse.move(box!.x + 10, box!.y + y);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width - 10, box!.y + y, { steps: 24 });
    await page.mouse.up();
  }
}

// Uses the existing Maison Sora fixture in an isolated memory-backed test server.
// All participation writes are intercepted: no contact, stock or e-mail is changed.
for (const isPreview of [false, true]) {
  for (const hasConditions of [true, false]) {
    for (const gameType of ["wheel", "scratch"]) {
      for (const collectBeforeGame of [false, true]) {
        test(`gain reception and QR confirmation (${gameType}, ${isPreview ? "preview" : "public"}, ${hasConditions ? "with" : "without"} conditions, contact ${collectBeforeGame ? "before" : "after"} game)`, async ({
          page,
        }, testInfo) => {
          const campaignId =
            gameType === "wheel" ? "camp-sora-social" : "camp-sora-review";
          await page.setViewportSize({ width: 390, height: 844 });
          await page.emulateMedia({ reducedMotion: "reduce" });
          const conditions =
            "Valable sur une prestation de 30 € minimum.\nNon cumulable avec une autre offre.";
          const prize = {
            id: "prize-gain-popin",
            label: "-10% PROCHAINE VISITE",
            purchaseRequired: hasConditions,
            usageConditions: hasConditions ? conditions : "",
          };
          let sessionPreviewToken: unknown;
          let finalizedPayload: Record<string, unknown> | undefined;
          let finalizationCount = 0;
          const pageErrors: string[] = [];
          page.on("pageerror", (error) => pageErrors.push(error.message));
          if (collectBeforeGame) {
            await enablePreGameCapture(page, campaignId);
          }
          await page.route("**/api/public/event", (route) =>
            route.fulfill({ json: {} }),
          );
          await page.route("**/api/public/draw/session", (route) => {
            sessionPreviewToken = route.request().postDataJSON().previewToken;
            return route.fulfill({
              json: {
                session: {
                  id: "session-gain-popin",
                  campaignId,
                  status: "pending",
                  isPreview,
                  previewSessionToken: isPreview
                    ? "test-preview-session"
                    : undefined,
                },
                prize,
              },
            });
          });
          await page.route("**/api/public/draw/finalize", (route) => {
            finalizationCount += 1;
            finalizedPayload = route.request().postDataJSON();
            return route.fulfill({
              json: {
                prize,
                lead: {
                  redemptionCode: "E2E-GAIN-449",
                  rewardAvailableAt: "2026-10-04T12:00:00.000Z",
                  rewardExpiresAt: "2026-11-04T12:00:00.000Z",
                },
                campaign: { actions: [] },
              },
            });
          });
          await page.goto(
            `/campaign/${campaignId}${isPreview ? "?preview=1" : ""}`,
          );
          if (collectBeforeGame) await page.waitForLoadState("networkidle");
          expect(pageErrors).toEqual([]);
          await page
            .getByRole("button", {
              name: gameType === "wheel" ? "JOUER" : "Je participe",
              exact: true,
            })
            .click();
          if (collectBeforeGame) {
            const beforeGame = page.getByRole("dialog");
            await expect(
              beforeGame.getByRole("heading", {
                name: "Avant de jouer",
                exact: true,
              }),
            ).toBeVisible();
            await beforeGame
              .getByPlaceholder("Prénom", { exact: true })
              .fill("Test");
            await beforeGame
              .getByPlaceholder("E-mail", { exact: true })
              .fill("e2e@okado.app");
            await expect(beforeGame.getByRole("checkbox")).not.toBeChecked();
            await beforeGame.getByRole("checkbox").check();
            await beforeGame
              .getByRole("button", {
                name: "Continuer vers le jeu",
                exact: true,
              })
              .click();
            expect(finalizationCount).toBe(0);
          }
          await page
            .getByRole("dialog")
            .getByRole("button", { name: "Jouer maintenant", exact: true })
            .click();

          if (gameType === "scratch") {
            await revealScratch(page);
          }

          const dialog = page.getByRole("dialog");
          const receive = dialog.getByRole("button", {
            name: "Recevoir mon gain",
            exact: true,
          });
          if (collectBeforeGame) {
            await expect(
              dialog.getByText(
                "Votre gain est confirmé. Cliquez sur suivant pour afficher les informations de retrait.",
                { exact: true },
              ),
            ).toBeVisible({ timeout: 15_000 });
            await expect(receive).toHaveCount(0);
            await expect(
              dialog.getByRole("link", {
                name: "Enregistrer mon QR code",
                exact: true,
              }),
            ).toHaveCount(0);
            await page.screenshot({
              path: testInfo.outputPath("pregame-contact-win-announcement.png"),
            });
            await dialog
              .getByRole("button", { name: "Suivant", exact: true })
              .click();
          } else {
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
              expect(conditionsBox!.y).toBeGreaterThan(
                buttonBox!.y + buttonBox!.height,
              );
            } else {
              await expect(
                dialog.getByText("Conditions d'utilisation", { exact: true }),
              ).toHaveCount(0);
            }
            await dialog
              .getByPlaceholder("Prénom", { exact: true })
              .fill("Test");
            await dialog
              .getByPlaceholder("E-mail", { exact: true })
              .fill("e2e@okado.app");
            await page.screenshot({
              path: testInfo.outputPath("receive-gain-mobile.png"),
            });
            await receive.click();
          }
          await expect(
            dialog.getByRole("heading", {
              name: "Votre gain est confirmé !",
              exact: true,
            }),
          ).toBeVisible();
          await expect(
            dialog.getByRole("button", { name: "Suivant", exact: true }),
          ).toHaveCount(0);
          await expect(dialog.getByText(/Cliquez sur suivant/)).toHaveCount(0);
          await expect(
            dialog.getByText(
              "Vous allez recevoir votre gain par e-mail (vérifiez vos spams).",
              { exact: true },
            ),
          ).toBeVisible();
          await expect(dialog.getByText(/Conservez.*ce QR code/)).toHaveCount(
            0,
          );
          const dates = dialog.getByText(
            "Vous avez entre le 04/10/2026 et le 04/11/2026 pour venir le récupérer.",
            { exact: true },
          );
          await expect(dates).toBeVisible();
          const dateBlock = dates.locator("..");
          if (hasConditions) {
            await expect(
              dateBlock.getByText(
                "Le retrait du lot est soumis à une condition d’achat.",
                { exact: true },
              ),
            ).toBeVisible();
            await expect(
              dateBlock.getByText(conditions, { exact: true }),
            ).toBeVisible();
          } else {
            await expect(
              dialog.getByText(/condition d’achat|Conditions d'utilisation/),
            ).toHaveCount(0);
          }
          const qr = dialog.getByRole("img", {
            name: "QR code E2E-GAIN-449",
            exact: true,
          });
          await expect(qr).toBeVisible();
          await expect
            .poll(() =>
              qr.evaluate(
                (image: HTMLImageElement) =>
                  image.complete && image.naturalWidth > 0,
              ),
            )
            .toBe(true);
          const save = dialog.getByRole("link", {
            name: "Enregistrer mon QR code",
            exact: true,
          });
          await expect(save).toHaveAttribute(
            "href",
            "/api/public/redeem/E2E-GAIN-449/qr",
          );
          await expect(save).toHaveAttribute(
            "download",
            "qr-lot-E2E-GAIN-449.svg",
          );
          const qrBox = await qr.boundingBox();
          const saveBox = await save.boundingBox();
          expect(saveBox!.y).toBeGreaterThan(qrBox!.y + qrBox!.height);
          await expect(
            dialog.getByText(
              "Présentez ce QR code lors de votre rendez-vous.",
              { exact: true },
            ),
          ).toBeVisible();
          await expect(
            dialog.getByText("Code de retrait : E2E-GAIN-449", { exact: true }),
          ).toHaveCSS("font-size", "12px");
          await expect(
            dialog.getByText(
              /Conservez ce QR code pour retirer|Enregistrez-le pour le retrouver/,
            ),
          ).toHaveCount(0);
          expect(finalizedPayload).toMatchObject({
            sessionId: "session-gain-popin",
            firstName: "Test",
            email: "e2e@okado.app",
            marketingConsent: collectBeforeGame,
          });
          expect(finalizationCount).toBe(1);
          if (isPreview) {
            expect(sessionPreviewToken).toBeTruthy();
            expect(finalizedPayload?.previewSessionToken).toBe(
              "test-preview-session",
            );
            await expect(dialog.getByText(/Résultat simulé/)).toBeVisible();
          } else {
            expect(sessionPreviewToken).toBeNull();
          }
          await page.screenshot({
            path: testInfo.outputPath("confirmed-gain-mobile.png"),
          });
          await page.setViewportSize({ width: 320, height: 568 });
          await save.scrollIntoViewIfNeeded();
          await expect(save).toBeVisible();
          expect(
            await dialog.evaluate(
              (element) => element.scrollWidth <= element.clientWidth,
            ),
          ).toBe(true);
          const downloadEvent = page.waitForEvent("download");
          await save.click();
          expect((await downloadEvent).suggestedFilename()).toBe(
            "qr-lot-E2E-GAIN-449.svg",
          );
          expect(pageErrors).toEqual([]);
        });
      }
    }
  }
}

for (const isPreview of [false, true]) {
  for (const gameType of ["wheel", "scratch"]) {
    test(`failed winner submission stays on the form until retry succeeds (${gameType}, ${isPreview ? "preview" : "public"})`, async ({
      page,
    }) => {
      const campaignId =
        gameType === "wheel" ? "camp-sora-social" : "camp-sora-review";
      await page.emulateMedia({ reducedMotion: "reduce" });
      const prize = {
        id: "prize-retry",
        label: "Lot de test",
        purchaseRequired: false,
      };
      await page.route("**/api/public/event", (route) =>
        route.fulfill({ json: {} }),
      );
      await page.route("**/api/public/draw/session", (route) =>
        route.fulfill({
          json: {
            session: {
              id: "session-retry",
              campaignId,
              status: "pending",
              isPreview,
              previewSessionToken: isPreview
                ? "test-preview-session"
                : undefined,
            },
            prize,
          },
        }),
      );
      const submittedPayloads: unknown[] = [];
      await page.route("**/api/public/draw/finalize", (route) => {
        submittedPayloads.push(route.request().postDataJSON());
        return submittedPayloads.length === 1
          ? route.fulfill({
              status: 500,
              json: { error: "Échec de test : réessayez." },
            })
          : route.fulfill({
              json: {
                prize,
                lead: { redemptionCode: "E2E-RETRY-449" },
                campaign: { actions: [] },
              },
            });
      });
      await page.goto(
        `/campaign/${campaignId}${isPreview ? "?preview=1" : ""}`,
      );
      await page.waitForLoadState("networkidle");
      await page
        .getByRole("button", {
          name: gameType === "wheel" ? "JOUER" : "Je participe",
          exact: true,
        })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Jouer maintenant", exact: true })
        .click();
      if (gameType === "scratch") await revealScratch(page);
      const dialog = page.getByRole("dialog");
      const receive = dialog.getByRole("button", {
        name: "Recevoir mon gain",
        exact: true,
      });
      await expect(receive).toBeVisible({ timeout: 15_000 });
      await dialog.getByPlaceholder("Prénom", { exact: true }).fill("Test");
      await dialog
        .getByPlaceholder("E-mail", { exact: true })
        .fill("e2e@okado.app");
      await receive.click();
      await expect(
        dialog.getByText("Échec de test : réessayez.", { exact: true }),
      ).toBeVisible();
      await expect(receive).toBeEnabled();
      await expect(
        dialog.getByPlaceholder("E-mail", { exact: true }),
      ).toHaveValue("e2e@okado.app");
      await expect(
        dialog.getByRole("button", { name: "Suivant", exact: true }),
      ).toHaveCount(0);
      await expect(
        dialog.getByRole("link", {
          name: "Enregistrer mon QR code",
          exact: true,
        }),
      ).toHaveCount(0);
      await receive.click();
      await expect(
        dialog.getByRole("heading", {
          name: "Votre gain est confirmé !",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        dialog.getByRole("img", { name: "QR code E2E-RETRY-449", exact: true }),
      ).toBeVisible();
      await expect(
        dialog.getByRole("button", { name: "Suivant", exact: true }),
      ).toHaveCount(0);
      expect(submittedPayloads).toHaveLength(2);
      expect(submittedPayloads[1]).toEqual(submittedPayloads[0]);
    });

    test(`pre-game capture without a prize keeps the contact-only confirmation (${gameType}, ${isPreview ? "preview" : "public"})`, async ({
      page,
    }) => {
      const campaignId =
        gameType === "wheel" ? "camp-sora-social" : "camp-sora-review";
      await page.emulateMedia({ reducedMotion: "reduce" });
      await enablePreGameCapture(page, campaignId);
      await page.route("**/api/public/event", (route) =>
        route.fulfill({ json: {} }),
      );
      await page.route("**/api/public/draw/session", (route) =>
        route.fulfill({
          json: {
            session: {
              id: "session-no-prize",
              campaignId,
              status: "pending",
              isPreview,
              previewSessionToken: isPreview
                ? "test-preview-session"
                : undefined,
            },
            prize: null,
          },
        }),
      );
      let finalizationCount = 0;
      await page.route("**/api/public/draw/finalize", (route) => {
        finalizationCount += 1;
        return route.fulfill({
          json: { prize: null, lead: {}, campaign: { actions: [] } },
        });
      });
      await page.goto(
        `/campaign/${campaignId}${isPreview ? "?preview=1" : ""}`,
      );
      await page
        .getByRole("button", {
          name: gameType === "wheel" ? "JOUER" : "Je participe",
          exact: true,
        })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.getByPlaceholder("Prénom", { exact: true }).fill("Test");
      await dialog
        .getByPlaceholder("E-mail", { exact: true })
        .fill("e2e@okado.app");
      await dialog.getByRole("checkbox").check();
      await dialog
        .getByRole("button", { name: "Continuer vers le jeu", exact: true })
        .click();
      await dialog
        .getByRole("button", { name: "Jouer maintenant", exact: true })
        .click();
      if (gameType === "scratch") await revealScratch(page);
      await expect(
        dialog.getByRole("heading", {
          name: "Merci pour votre participation !",
          exact: true,
        }),
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        dialog.getByText("Votre contact est bien enregistré.", { exact: true }),
      ).toBeVisible();
      await expect(
        dialog.getByRole("button", { name: "Suivant", exact: true }),
      ).toHaveCount(0);
      await expect(
        dialog.getByRole("link", {
          name: "Enregistrer mon QR code",
          exact: true,
        }),
      ).toHaveCount(0);
      expect(finalizationCount).toBe(1);
    });
  }
}
