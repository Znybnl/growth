import { expect, test } from "@playwright/test";

import { toPublicCampaignPresentation } from "../src/lib/public-campaign";
import type { CampaignPresentation } from "../src/lib/types";

test("public game presentation excludes poster-only image data without mutating gameplay artwork", () => {
  const gameArtwork = "data:image/png;base64,game-image";
  const posterArtwork = "data:image/png;base64,poster-image";
  const presentation = {
    background: { mode: "image", imageUrl: gameArtwork },
    poster: { backgroundImageUrl: posterArtwork },
  } as unknown as CampaignPresentation;

  const publicPresentation = toPublicCampaignPresentation(presentation);

  expect(publicPresentation.background.imageUrl).toBe(gameArtwork);
  expect("poster" in publicPresentation).toBe(false);
  expect(JSON.stringify(publicPresentation)).not.toContain(posterArtwork);
  expect(presentation.poster.backgroundImageUrl).toBe(posterArtwork);
});

test("public game preview renders and refreshes only participant actions", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const refreshResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/public/campaign/camp-sora-review") &&
      response.status() === 200,
  );
  await page.goto("/campaign/camp-sora-review?preview=1");

  const response = await refreshResponse;
  const payload = (await response.json()) as {
    campaign: Record<string, unknown> & { actions: unknown[] };
  };
  expect(Object.keys(payload.campaign)).toEqual(["actions"]);
  expect(payload.campaign.actions.length).toBeGreaterThan(0);
  await expect(page.getByText("Maison Sora")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Partagez votre expérience puis découvrez instantanément votre lot/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Je participe" })).toBeVisible();
  await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
  expect(pageErrors).toEqual([]);
  await page.screenshot({
    path: "test-results/public-campaign-transfer-smoke.png",
    fullPage: true,
  });
});

const marketingActionScenarios = [
  {
    campaignId: "camp-sora-review",
    initialButton: "Je participe",
    actionLabel: "Écrire un avis",
    explanation:
      "Découvrez notre établissement sur Google, puis revenez ici pour jouer.",
  },
  {
    campaignId: "camp-sora-social",
    initialButton: "JOUER",
    actionLabel: "Suivez-nous sur Instagram",
    explanation:
      "Suivez-nous sur Instagram pour découvrir les nouveautés du commerce, puis revenez ici pour jouer.",
  },
];

for (const isPreview of [true, false]) {
  for (const scenario of marketingActionScenarios) {
    test(`marketing action typography stays clear for ${scenario.actionLabel} (${isPreview ? "preview" : "public game"})`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.route("**/api/public/event", (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
      );
      await page.goto(
        `/campaign/${scenario.campaignId}${isPreview ? "?preview=1" : ""}`,
      );
      await page.getByRole("button", { name: scenario.initialButton }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const explanation = dialog.getByText(scenario.explanation, { exact: true });
      await expect(explanation).toHaveCSS("line-height", "28px");

      const action = dialog.getByRole("link", { name: scenario.actionLabel });
      const popupPromise = page.waitForEvent("popup");
      await action.click();
      await (await popupPromise).close();

      const playButton = dialog.getByRole("button", { name: "Jouer" });
      await expect(playButton).toHaveCSS("font-size", "24px");
      await expect(playButton).toHaveCSS("font-weight", "700");
      await expect(playButton).toHaveCSS("padding-top", "18px");
      await expect(action).toHaveCSS("font-size", "18px");
      await page.screenshot({ path: testInfo.outputPath("marketing-action-typography.png") });
    });
  }
}
