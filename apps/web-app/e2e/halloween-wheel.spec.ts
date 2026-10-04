import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCampaignSetupInput } from "../src/lib/merchant-input";
import {
  defaultWheelBlockSpacingForTemplate,
  DEFAULT_WHEEL_SPACING_PX,
  wheelHeadingFontForTemplateSelection,
  wheelLogoColorForTemplateSelection,
  wheelLogoGapForTemplateSelection,
} from "../src/lib/campaign-defaults";

test("enregistrement du template Halloween et isolation des réglages des autres modèles", () => {
  const parsed = parseCampaignSetupInput(
    {
      gameType: "wheel",
      isActive: false,
      accent: {},
      rewardRules: {},
      presentation: {
        logo: {},
        background: {},
        heading: {},
        button: {},
        wheel: {},
        poster: { wheel: {} },
        email: {},
        layout: {
          templateId: "halloween-gold",
          wheelTemplateStyles: {
            "halloween-gold": { logoBottomSpacingPx: 5 },
            classic: { logoBottomSpacingPx: 37 },
          },
        },
      },
      prizes: [{ id: "ten", label: "-10%", probability: 50 }],
    },
    "test-merchant",
  );
  expect(parsed.presentation.layout.templateId).toBe("halloween-gold");
  expect(parsed.prizes[0].probability).toBe(50);
  expect(
    parsed.presentation.layout.wheelTemplateStyles?.classic
      ?.logoBottomSpacingPx,
  ).toBe(37);
  expect(
    wheelHeadingFontForTemplateSelection("halloween-gold", "fredoka"),
  ).toBe("bodoni");
  expect(wheelLogoColorForTemplateSelection("halloween-gold", "#000000")).toBe(
    "#ffffff",
  );
  expect(wheelHeadingFontForTemplateSelection("classic", "fredoka")).toBe(
    "poppins",
  );
  expect(defaultWheelBlockSpacingForTemplate("halloween-gold")).toBe(DEFAULT_WHEEL_SPACING_PX);
  expect(
    wheelLogoGapForTemplateSelection("halloween-gold", "classic", 50),
  ).toBe(DEFAULT_WHEEL_SPACING_PX);
  expect(
    wheelLogoGapForTemplateSelection("halloween-gold", "classic", 21, 0),
  ).toBe(0);
  expect(
    wheelLogoGapForTemplateSelection("halloween-gold", "classic", 50, 5),
  ).toBe(5);
  expect(
    wheelLogoGapForTemplateSelection("classic", "halloween-gold", 5, 37),
  ).toBe(37);
  expect(
    wheelLogoGapForTemplateSelection("beauty-rose", "halloween-gold", 5),
  ).toBe(50);
  expect(
    wheelLogoGapForTemplateSelection("classic", "restaurant-pop", 21),
  ).toBe(21);
});

test("le packaging Vercel inclut les assets Halloween malgré l’exclusion globale WebP", () => {
  const rules = readFileSync(resolve(__dirname, "../../../.vercelignore"), "utf8");
  const allowRule = "!apps/web-app/public/images/templates/halloween-gold/*.webp";
  const lines = rules.split(/\r?\n/);
  expect(lines).toContain(allowRule);
  expect(lines.lastIndexOf(allowRule)).toBeGreaterThan(lines.lastIndexOf("*.webp"));
});

for (const width of [320, 390, 600, 1280]) {
  test(`affichage Halloween sans débordement à ${width}px`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/dev/halloween-proof");
    await expect(page.getByTestId("halloween-wheel")).toHaveAttribute(
      "data-segment-count",
      "6",
    );
    await expect(
      page.getByRole("heading", { name: "TOURNEZ LA ROUE" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Jouer à la roue" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Jouer à la roue" }).locator("svg,img"),
    ).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    await expect
      .poll(() =>
        page
          .getByTestId("halloween-wheel-scene")
          .locator("img")
          .evaluateAll((images) =>
            images.every(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    const bounds = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.width);
    expect(
      await page
        .getByTestId("halloween-wheel")
        .getByText("-10% PROCHAINE VISITE", { exact: true })
        .count(),
    ).toBeGreaterThan(0);
    await page
      .getByTestId("halloween-wheel-scene")
      .screenshot({ path: testInfo.outputPath(`halloween-${width}.png`) });
    expect(errors).toEqual([]);
  });
}

test("proportions de roue préservées et espacements communs de 50px à 390px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/halloween-proof");
  await page.evaluate(() => document.fonts.ready);
  const scene = await page.getByTestId("halloween-wheel-scene").boundingBox();
  const wheel = await page.getByTestId("halloween-wheel").boundingBox();
  const center = await page
    .getByRole("button", { name: "Jouer à la roue" })
    .boundingBox();
  expect(scene).not.toBeNull();
  expect(wheel).not.toBeNull();
  expect(center).not.toBeNull();
  expect(wheel!.width / scene!.width).toBeCloseTo(0.82, 2);
  expect((wheel!.y + wheel!.height / 2 - scene!.y) / scene!.width).toBeCloseTo(
    1.20,
    2,
  );
  expect(center!.width / wheel!.width).toBeCloseTo(0.31, 2);
  const gaps = await page.getByTestId("halloween-wheel-scene").evaluate((scene) => ({
    logo: getComputedStyle(scene.querySelector("header")!).marginBottom,
    wheel: getComputedStyle(scene.querySelector('[data-testid="halloween-wheel"]')!.parentElement!).marginTop,
  }));
  expect(gaps).toEqual({ logo: "50px", wheel: "50px" });
  await expect(
    page
      .getByTestId("halloween-wheel-scene")
      .locator('img[alt="Spécial Halloween"]'),
  ).toHaveAttribute("src", /wordmark-v3/);
  await expect(
    page.getByTestId("halloween-wheel").locator("image[href$='foil.webp']"),
  ).toHaveCount(1);
});

test("le titre reste éditable, sans réduction automatique ni chevauchement avec la roue", async ({
  page,
}) => {
  await page.goto("/dev/halloween-proof");
  await page
    .getByLabel("Titre de test", { exact: true })
    .fill("Votre surprise\nHalloween\nvous attend");
  await page.getByLabel("Taille de test").fill("48");
  await expect(page.locator("h1")).toHaveText(
    "Votre surprise Halloween vous attend",
  );
  const boxes = await page.evaluate(() => ({
    title: document.querySelector("h1")!.getBoundingClientRect().bottom,
    wheel: document
      .querySelector('[data-testid="halloween-wheel"]')!
      .getBoundingClientRect().top,
    size: getComputedStyle(document.querySelector("h1")!).fontSize,
  }));
  expect(boxes.wheel).toBeGreaterThan(boxes.title);
  expect(boxes.size).toBe("48px");
});

for (const automatic of [false, true]) {
  test(`animation ${automatic ? "automatique" : "au clic"} : arrêt sur le vrai lot et une seule finalisation`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/dev/halloween-proof?mode=spin");
    await expect(page.getByTestId("halloween-wheel")).toBeVisible();
    if (automatic)
      await page
        .getByRole("button", { name: "Déclencher l’animation automatiquement" })
        .click();
    else await page.getByRole("button", { name: "Jouer à la roue" }).click();
    await expect(page.getByTestId("spin-finished")).toHaveText("1");
    await expect(
      page.getByRole("button", { name: "Jouer à la roue" }),
    ).toBeDisabled();
    const actualId = await page
      .getByTestId("halloween-wheel")
      .evaluate((wheel) => {
        const rotation = Number(
          wheel
            .querySelector('[data-testid="halloween-wheel-rotor"]')!
            .getAttribute("style")!
            .match(/rotate\(([-\d.]+)deg\)/)![1],
        );
        const groups = [...wheel.querySelectorAll("g[data-segment-id]")];
        const angle = 360 / groups.length;
        const index = Math.floor(((360 - (rotation % 360)) % 360) / angle);
        return groups[index].getAttribute("data-segment-id");
      });
    expect(actualId).toBe("reward-ten");
  });
}

test("logo image, logo absent et sous-titre conservés ; zéro espacement sans chevauchement", async ({
  page,
}) => {
  await page.goto("/dev/halloween-proof");
  await page.getByRole("button", { name: "Tester le logo image" }).click();
  await expect(
    page
      .getByTestId("halloween-wheel-scene")
      .getByRole("img", { name: "INSTITUT BELLE PEAU" }),
  ).toBeVisible();
  await page
    .getByLabel("Sous-titre de test")
    .fill("Une surprise pour votre prochaine visite");
  await expect(
    page.getByText("Une surprise pour votre prochaine visite", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Espacement de test").fill("0");
  const boxes = await page.evaluate(() => ({
    title: document.querySelector("h1")!.getBoundingClientRect().bottom,
    wheel: document
      .querySelector('[data-testid="halloween-wheel"]')!
      .getBoundingClientRect().top,
  }));
  expect(boxes.wheel).toBeGreaterThan(boxes.title);
  await page.getByRole("button", { name: "Tester sans logo" }).click();
  await expect(
    page.getByTestId("halloween-wheel-scene").locator("header"),
  ).toHaveCount(0);
});

test("miniature fidèle et non interactive, sans bouton imbriqué dans le sélecteur", async ({
  page,
}) => {
  await page.goto("/dev/halloween-proof?mode=thumbnail");
  const thumbnail = page.getByTestId("wheel-template-thumbnail-halloween-gold");
  await expect(thumbnail.getByTestId("halloween-wheel")).toHaveAttribute(
    "data-segment-count",
    "6",
  );
  await expect(thumbnail.locator("button")).toHaveCount(0);
});

test("page de jeu en prévisualisation : clic, session simulée, animation et formulaire du vrai lot", async ({
  page,
}, testInfo) => {
  let sessionRequests = 0;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/public/campaign/fixture-halloween?*", (route) =>
    route.fulfill({ json: { campaign: { actions: [] } } }),
  );
  await page.route("**/api/public/draw/session", async (route) => {
    sessionRequests++;
    expect(route.request().postDataJSON()).toMatchObject({
      campaignId: "fixture-halloween",
      previewToken: "fixture-only-token",
    });
    await route.fulfill({
      json: {
        session: {
          id: "session-fixture",
          campaignId: "fixture-halloween",
          status: "pending",
          createdAt: "2026-10-04T00:00:00Z",
          expiresAt: "2026-10-05T00:00:00Z",
          isPreview: true,
        },
        prize: {
          id: "reward-ten",
          label: "-10% PROCHAINE VISITE",
          probability: 50,
          purchaseRequired: false,
        },
      },
    });
  });
  await page.goto("/dev/halloween-proof?mode=public");
  await expect(page.getByRole("status")).toContainText("Mode prévisualisation");
  await page
    .getByTestId("halloween-wheel-scene")
    .screenshot({ path: testInfo.outputPath("halloween-public.png") });
  await page.getByRole("button", { name: "Jouer à la roue" }).click();
  await expect(
    page.getByRole("heading", { name: "Prêt à jouer ?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Recevoir mon gain" }),
  ).toBeVisible();
  await expect(
    page.getByText("-10% PROCHAINE VISITE", { exact: true }).last(),
  ).toBeVisible();
  expect(sessionRequests).toBe(1);
});

test("les quatre assets et les six pictogrammes sont réellement servis", async ({
  request,
}) => {
  for (const asset of [
    "background",
    "frame-v2",
    "wordmark-v3",
    "foil",
    "gift",
    "mask",
    "pumpkin",
    "sparkles",
    "heart",
    "gem",
  ]) {
    const response = await request.get(
      `/images/templates/halloween-gold/${asset}.webp`,
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/webp");
    expect((await response.body()).length).toBeLessThan(500_000);
  }
});
