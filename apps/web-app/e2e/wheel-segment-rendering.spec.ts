import { expect, test } from "@playwright/test";
import { contrastRatio } from "../src/lib/color-contrast";
import { signIn } from "./auth-session";

test("les libellés Éclat contrastent avec chaque segment dans l’aperçu", async ({ page }, testInfo) => {
  await signIn(page);
  await page.goto("/campaigns/new/guided");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByPlaceholder("Ex. La roue gourmande de juin").fill("Contrôle contraste des lots");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByRole("button", { name: /^Éclat/ }).click();
  await page.getByLabel("Couleur principale").first().fill("#b99052");

  const wheel = page.getByTestId("wizard-phone-preview").locator('svg[viewBox="0 0 640 640"]');
  await expect(wheel).toBeVisible();
  const colors = await wheel.locator("g").evaluateAll((groups) =>
    groups.flatMap((group) => {
      const segment = group.querySelector(":scope > path[fill]");
      const label = group.querySelector(":scope > text[fill]");
      return segment && label
        ? [{ background: segment.getAttribute("fill") ?? "", text: label.getAttribute("fill") ?? "" }]
        : [];
    }),
  );
  expect(colors.length).toBeGreaterThan(0);
  for (const { background, text } of colors) {
    expect(contrastRatio(background, text), `${background} / ${text}`).toBeGreaterThanOrEqual(4.5);
  }
  await page.getByTestId("wizard-phone-preview").screenshot({ path: testInfo.outputPath("eclat-label-contrast.png") });
});
