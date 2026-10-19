import { expect, test, type Locator } from "@playwright/test";
import {
  ANALYTICS_CONSENT_COOKIE,
  ANALYTICS_CONSENT_VERSION,
} from "../src/lib/analytics-consent";

// Remove only fixed overlays from element screenshots, never from the app.
const snapshotStyle = 'header.sticky, button[aria-controls="okado-cookie-preferences"] { visibility: hidden !important; }';

async function expectContentInsidePhone(phone: Locator) {
  const overflow = await phone.evaluate((frame) => {
    const bounds = frame.getBoundingClientRect();
    return [...frame.querySelectorAll<HTMLElement>("h3, p, button, input, fieldset")]
      .filter((element) => getComputedStyle(element).visibility !== "hidden")
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && (box.left < bounds.left || box.right > bounds.right
          || box.top < bounds.top || box.bottom > bounds.bottom
          || element.scrollWidth > element.clientWidth + 1);
      }).map((element) => element.tagName + ": " + element.textContent);
  });
  expect(overflow).toEqual([]);
}

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
  // Three complete journeys, real rotations and per-screen visual evidence.
  test.setTimeout(60000);
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
    const phoneScreen = demo.getByTestId("demo-phone");
    await expect(phoneScreen).toContainText(
      path === "/instituts-beaute" ? "L’atelier beauté" : "Le bistro",
    );
    await expect(demo.getByText("Comprendre cette étape")).toHaveCount(0);
    await expect(demo.getByTestId("demo-disclaimer")).toHaveCount(1);
    await expect(phoneScreen.getByTestId("demo-disclaimer")).toHaveCount(0);
    await expect(phoneScreen).not.toContainText(
      /simulation|démonstration|fictif/i,
    );
    const play = demo.getByRole("button", { name: "Jouer", exact: true });
    await expect(play).toBeEnabled();
    await expect(play.locator("svg")).toHaveCount(0);
    await expectContentInsidePhone(phoneScreen);
    await expect(demo.getByTestId("demo-business-mark")).toHaveText(
      path === "/instituts-beaute" ? "ab" : "lb",
    );
    await expect(
      demo.getByTestId("demo-business-mark").locator("svg"),
    ).toHaveCount(0);
    await expect(
      demo.getByTestId("demo-wheel").locator("svg path"),
    ).toHaveCount(8);
    await expect(
      demo
        .getByTestId("demo-wheel")
        .locator("svg text")
        .filter({ hasText: "Perdu" }),
    ).toHaveCount(4);
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
        style: snapshotStyle,
        path: testInfo.outputPath(
          `${path === "/" ? "restaurant" : "beauty"}-demo.png`,
        ),
      });

    await play.click();
    await expect(
      demo.getByRole("heading", { name: "Avant de jouer" }),
    ).toBeFocused();
    await expectContentInsidePhone(phoneScreen);
    if (path !== "/restaurants") await phoneScreen.screenshot({ path: testInfo.outputPath(`${path === "/" ? "restaurant" : "beauty"}-action.png`), style: snapshotStyle });
    for (const name of ["Écrire un avis", "Jouer maintenant"]) {
      const button = demo.getByRole("button", { name });
      await expect(button).toBeVisible();
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await demo
      .getByRole("button", {
        name: path === "/" ? "Jouer maintenant" : "Écrire un avis",
      })
      .click();
    if (path !== "/") {
      await expect(
        demo.getByRole("heading", { name: "Votre avis sur Google" }),
      ).toBeFocused();
      await expectContentInsidePhone(phoneScreen);
      if (path === "/instituts-beaute") await phoneScreen.screenshot({ path: testInfo.outputPath("beauty-google.png"), style: snapshotStyle });
      await demo.getByRole("radio", { name: "5 étoiles", exact: true }).check();
      await demo
        .getByRole("button", { name: "Revenir au jeu", exact: true })
        .click();
    }
    const rotor = demo.getByTestId("demo-wheel");
    await expect(
      demo.getByRole("button", { name: "Roue en cours de rotation" }),
    ).toBeDisabled();
    await expect(rotor).toHaveAttribute("style", /rotate\(1777\.5deg\)/);
    const formTitle = demo.getByRole("heading", {
      name: `Félicitations ! Vous avez remporté « ${reward} »`,
    });
    await expect(formTitle).toBeFocused();
    await expectContentInsidePhone(phoneScreen);
    if (path !== "/restaurants") await phoneScreen.screenshot({ path: testInfo.outputPath(`${path === "/" ? "restaurant" : "beauty"}-form.png`), style: snapshotStyle });
    await expect(
      demo.getByText(
        "Vos informations sont nécessaires pour valider et envoyer votre gain.",
      ),
    ).toBeVisible();
    await expect(phoneScreen).not.toContainText(
      /simulation|démonstration|fictif/i,
    );
    await expect(demo.locator('li[aria-current="step"]')).toHaveText(
      /Recevoir/,
    );
    await page.getByLabel("Prénom de démonstration").fill("Camille");
    await page.getByLabel("E-mail de démonstration").fill("demo@example.test");
    const receive = demo.getByRole("button", {
      name: "Recevoir mon gain",
      exact: true,
    });
    expect(
      await receive.evaluate((button) => getComputedStyle(button).fontSize),
    ).toBe("20px");
    await receive.click();
    await expect(
      demo.getByRole("heading", { name: "Votre gain est confirmé !" }),
    ).toBeFocused();
    await expect(demo.locator('li[aria-current="step"]')).toHaveText(/E-mail/);
    await expect(
      demo.getByText(/Vous allez recevoir votre gain par e-mail/),
    ).toBeVisible();
    await expect(demo.getByTestId("demo-redemption-qr")).toBeVisible();
    await expectContentInsidePhone(phoneScreen);
    if (path !== "/restaurants") await phoneScreen.screenshot({ path: testInfo.outputPath(`${path === "/" ? "restaurant" : "beauty"}-confirmation.png`), style: snapshotStyle });
    await expect(
      demo.getByText(
        "Vous allez recevoir votre gain par e-mail (vérifiez vos spams).",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(phoneScreen).not.toContainText(
      /simulation|démonstration|fictif/i,
    );
    await demo.getByRole("button", { name: "Voir l’e-mail" }).click();
    await expect(
      demo.getByRole("heading", { name: "Votre e-mail de gain" }),
    ).toBeFocused();
    await expect(
      demo.getByText("À : camille@exemple.test", { exact: true }),
    ).toBeVisible();
    await expectContentInsidePhone(phoneScreen);
    if (path !== "/restaurants") await phoneScreen.screenshot({ path: testInfo.outputPath(`${path === "/" ? "restaurant" : "beauty"}-mail.png`), style: snapshotStyle });
    await expect(demo.getByTestId("demo-redemption-qr")).toBeVisible();
    await expect(phoneScreen.locator("a")).toHaveCount(0);
    await expect(phoneScreen).not.toContainText(
      /simulation|démonstration|fictif|Dans un jeu réel/i,
    );
    await demo
      .getByRole("button", { name: "Revenir à la confirmation" })
      .click();
    await expect(
      demo.getByRole("heading", { name: "Votre gain est confirmé !" }),
    ).toBeFocused();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(page.viewportSize()!.width);
    await demo.getByRole("button", { name: "Redémarrer la démo" }).click();
    await expect(play).toBeFocused();
    await play.click();
    await demo.getByRole("button", { name: "Jouer maintenant" }).click();
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
    demo.getByRole("heading", { name: "Avant de jouer" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    demo.getByRole("button", { name: "Écrire un avis" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    demo.getByRole("button", { name: "Jouer maintenant" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  expect(
    await demo
      .getByTestId("demo-wheel")
      .evaluate((wheel) => getComputedStyle(wheel).transitionDuration),
  ).toBe("0s");
  await expect(
    demo.getByRole("heading", { name: /Félicitations/ }),
  ).toBeFocused({
    timeout: 1500,
  });
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Prénom de démonstration")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("E-mail de démonstration")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    demo.getByRole("button", { name: "Recevoir mon gain" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    demo.getByRole("heading", { name: "Votre gain est confirmé !" }),
  ).toBeFocused();
});

test("redémarrer pendant la rotation annule le résultat différé", async ({
  page,
}) => {
  await page.goto("/");
  const demo = page.locator("#demo");
  await demo.getByRole("button", { name: "Jouer", exact: true }).click();
  await demo.getByRole("button", { name: "Jouer maintenant" }).click();
  await expect(demo.getByRole("status").filter({ hasText: "La roue tourne…" })).toHaveText("La roue tourne…");
  await demo.getByRole("button", { name: "Redémarrer la démo" }).click();
  await page.waitForTimeout(2300);
  await expect(
    demo.getByRole("button", { name: "Jouer", exact: true }),
  ).toBeEnabled();
  await expect(
    demo.getByRole("heading", { name: /Félicitations/ }),
  ).toHaveCount(0);
});

test("Google simulé : aucune note, 1 ou 5 étoiles donnent le même gain sans échange réseau ni stockage", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const outgoing: string[] = [];
  page.on("request", (request) => {
    const host = new URL(request.url()).hostname;
    if (
      request.method() === "POST" ||
      /(^|\.)(google\.com|googleapis\.com|gstatic\.com)$/.test(host)
    )
      outgoing.push(host);
  });
  for (const [path, reward] of [
    ["/", "1 dessert"],
    ["/restaurants", "1 dessert"],
    ["/instituts-beaute", "un soin découverte"],
  ]) {
    for (const rating of [0, 1, 5]) {
      await page.goto(path);
      const storage = await page.evaluate(() => [
        Object.entries(localStorage),
        Object.entries(sessionStorage),
      ]);
      const demo = page.locator("#demo");
      await demo.getByRole("button", { name: "Jouer", exact: true }).click();
      await demo.getByRole("button", { name: "Écrire un avis" }).click();
      await expect(
        demo.getByRole("heading", { name: "Votre avis sur Google" }),
      ).toBeFocused();
      await expect(demo.getByRole("radio")).toHaveCount(5);
      await expect(demo.locator('input[type="radio"]:checked')).toHaveCount(0);
      if (rating)
        await demo
          .getByRole("radio", {
            name: rating === 1 ? "1 étoile" : "5 étoiles",
            exact: true,
          })
          .check();
      await expect(
        demo.getByText("Comprendre cette étape", { exact: true }),
      ).toHaveCount(0);
      await demo
        .getByRole("button", { name: "Revenir au jeu", exact: true })
        .click();
      await expect(
        demo.getByRole("heading", {
          name: `Félicitations ! Vous avez remporté « ${reward} »`,
        }),
      ).toBeFocused();
      await demo
        .getByRole("button", { name: "Recevoir mon gain", exact: true })
        .click();
      await expect(
        demo.getByRole("heading", { name: "Votre gain est confirmé !" }),
      ).toBeFocused();
      await expect(demo.getByText("320", { exact: true })).toBeVisible();
      await expect(demo.getByText("117", { exact: true })).toBeVisible();
      expect(
        await page.evaluate(() => [
          Object.entries(localStorage),
          Object.entries(sessionStorage),
        ]),
      ).toEqual(storage);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(page.viewportSize()!.width);
    }
  }
  expect(outgoing).toEqual([]);
});

test("étoiles au clavier, retour de l’aperçu e-mail et remise à zéro de tous les écrans", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const demo = page.locator("#demo");
  await demo.getByRole("button", { name: "Jouer", exact: true }).click();
  await demo.getByRole("button", { name: "Écrire un avis" }).click();
  await page.keyboard.press("Tab");
  const first = demo.getByRole("radio", { name: "1 étoile", exact: true });
  await expect(first).toBeFocused();
  await expect(first).not.toBeChecked();
  await page.keyboard.press("ArrowRight");
  await expect(
    demo.getByRole("radio", { name: "2 étoiles", exact: true }),
  ).toBeChecked();
  await page.keyboard.press("ArrowLeft");
  await expect(first).toBeChecked();
  await demo.getByRole("button", { name: "Redémarrer la démo" }).click();
  await demo.getByRole("button", { name: "Jouer", exact: true }).click();
  await demo.getByRole("button", { name: "Écrire un avis" }).click();
  await expect(demo.locator('input[type="radio"]:checked')).toHaveCount(0);
  await demo
    .getByRole("button", { name: "Revenir au jeu", exact: true })
    .click();
  await page.getByLabel("Prénom de démonstration").fill("Camille");
  await page
    .getByLabel("E-mail de démonstration")
    .fill("local-only@example.test");
  await demo
    .getByRole("button", { name: "Recevoir mon gain", exact: true })
    .click();
  await demo.getByRole("button", { name: "Voir l’e-mail" }).click();
  await expect(
    demo.getByRole("heading", { name: "Votre e-mail de gain" }),
  ).toBeFocused();
  await expect(
    demo.getByText("À : camille@exemple.test", { exact: true }),
  ).toBeVisible();
  await expect(demo.getByTestId("demo-phone")).not.toContainText(
    "local-only@example.test",
  );
  await demo.getByRole("button", { name: "Revenir à la confirmation" }).click();
  await expect(
    demo.getByRole("heading", { name: "Votre gain est confirmé !" }),
  ).toBeFocused();
  await demo.getByRole("button", { name: "Voir l’e-mail" }).click();
  await demo.getByRole("button", { name: "Redémarrer la démo" }).click();
  await expect(
    demo.getByRole("button", { name: "Jouer", exact: true }),
  ).toBeFocused();
  await demo.getByRole("button", { name: "Jouer", exact: true }).click();
  await demo.getByRole("button", { name: "Jouer maintenant" }).click();
  await expect(page.getByLabel("Prénom de démonstration")).toHaveValue("");
  await expect(page.getByLabel("E-mail de démonstration")).toHaveValue("");
});
