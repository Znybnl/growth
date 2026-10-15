import { expect, test } from "@playwright/test";
import {
  ANALYTICS_CONSENT_COOKIE,
  ANALYTICS_CONSENT_VERSION,
} from "../src/lib/analytics-consent";

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    {
      name: ANALYTICS_CONSENT_COOKIE,
      value: encodeURIComponent(
        JSON.stringify({
          version: ANALYTICS_CONSENT_VERSION,
          choice: "rejected",
          decidedAt: Date.now(),
        }),
      ),
      url: baseURL!,
    },
  ]);
  await context.route(/https:\/\/[^/]*posthog\.com\//, (route) =>
    route.abort(),
  );
  await context.route("**/_vercel/insights/**", (route) => route.abort());
});

test("roue entière, étapes lisibles et résultats accessibles dans les trois variantes", async ({
  page,
}, testInfo) => {
  const mutations: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") mutations.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  for (const [path, reward] of [
    ["/", "1 dessert"],
    ["/restaurants", "1 dessert"],
    ["/instituts-beaute", "un soin découverte"],
  ]) {
    await page.goto(path);
    const demo = page.locator("#demo");
    const play = demo.getByRole("button", { name: "Jouer", exact: true });
    await expect(play).toBeEnabled();
    await expect(demo.getByText("320", { exact: true })).toBeVisible();
    await expect(demo.getByText("117", { exact: true })).toBeVisible();
    await expect(
      demo.getByRole("img", { name: /320 scans et 117 contacts/ }),
    ).toBeVisible();
    const wheel = await demo
      .getByTestId("demo-wheel")
      .locator("..")
      .boundingBox();
    const phone = await demo.getByTestId("demo-phone").boundingBox();
    expect(wheel!.x).toBeGreaterThan(phone!.x);
    expect(wheel!.x + wheel!.width).toBeLessThan(phone!.x + phone!.width);
    expect(Math.abs(wheel!.width - wheel!.height)).toBeLessThan(1);
    expect((await play.boundingBox())!.width).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(page.viewportSize()!.width);
    if (path !== "/restaurants")
      await demo.screenshot({
        path: testInfo.outputPath(
          `${path === "/" ? "restaurant" : "beauty"}-demo.png`,
        ),
      });

    await play.click();
    await expect(
      demo.getByRole("heading", { name: "Partager votre expérience ?" }),
    ).toBeFocused();
    for (const name of [
      "Simuler le clic vers Google",
      "Continuer sans laisser d’avis",
    ]) {
      const button = demo.getByRole("button", { name });
      await expect(button).toBeVisible();
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await demo
      .getByRole("button", {
        name:
          path === "/"
            ? "Continuer sans laisser d’avis"
            : "Simuler le clic vers Google",
      })
      .click();
    const rotor = demo.getByTestId("demo-wheel");
    await expect(
      demo.getByRole("button", { name: "Roue en cours de rotation" }),
    ).toBeDisabled();
    await expect(rotor).toHaveAttribute("style", /rotate\(1782deg\)/);
    const formTitle = demo.getByRole("heading", {
      name: `Bravo, vous avez gagné ${reward}.`,
    });
    await expect(formTitle).toBeFocused();
    await expect(demo.locator('li[aria-current="step"]')).toHaveText(/Le gain/);
    await page.getByLabel("Prénom de démonstration").fill("Camille");
    await page.getByLabel("E-mail de démonstration").fill("demo@example.test");
    await demo.getByRole("button", { name: "Simuler la confirmation" }).click();
    await expect(
      demo.getByRole("heading", { name: "Exemple de confirmation du gain." }),
    ).toBeFocused();
    await expect(demo.locator('li[aria-current="step"]')).toHaveText(
      /La suite/,
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(page.viewportSize()!.width);
    await demo.getByRole("button", { name: "Redémarrer la démo" }).click();
    await expect(play).toBeFocused();
    await play.click();
    await demo
      .getByRole("button", { name: "Continuer sans laisser d’avis" })
      .click();
    await expect(page.getByLabel("Prénom de démonstration")).toHaveValue("");
    await expect(page.getByLabel("E-mail de démonstration")).toHaveValue("");
  }
  expect(mutations).toEqual([]);
  expect(errors).toEqual([]);
});

test("parcours clavier et mouvement réduit : pas de rotation animée ni de formulaire obligatoire", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const demo = page.locator("#demo");
  const play = demo.getByRole("button", { name: "Jouer", exact: true });
  await play.focus();
  expect(
    await play.evaluate((button) => getComputedStyle(button).outlineStyle),
  ).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(
    demo.getByRole("heading", { name: "Partager votre expérience ?" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    demo.getByRole("button", { name: "Simuler le clic vers Google" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    demo.getByRole("button", { name: "Continuer sans laisser d’avis" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  expect(
    await demo
      .getByTestId("demo-wheel")
      .evaluate((wheel) => getComputedStyle(wheel).transitionDuration),
  ).toBe("0s");
  await expect(demo.getByRole("heading", { name: /Bravo/ })).toBeFocused({
    timeout: 1500,
  });
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Prénom de démonstration")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("E-mail de démonstration")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    demo.getByRole("button", { name: "Simuler la confirmation" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    demo.getByRole("heading", { name: "Exemple de confirmation du gain." }),
  ).toBeFocused();
});

test("redémarrer pendant la rotation annule le résultat différé", async ({
  page,
}) => {
  await page.goto("/");
  const demo = page.locator("#demo");
  await demo.getByRole("button", { name: "Jouer", exact: true }).click();
  await demo
    .getByRole("button", { name: "Continuer sans laisser d’avis" })
    .click();
  await expect(demo.getByRole("status")).toHaveText("La roue tourne…");
  await demo.getByRole("button", { name: "Redémarrer la démo" }).click();
  await page.waitForTimeout(2300);
  await expect(
    demo.getByRole("button", { name: "Jouer", exact: true }),
  ).toBeEnabled();
  await expect(demo.getByRole("heading", { name: /Bravo/ })).toHaveCount(0);
});
