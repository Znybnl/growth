import { expect, test } from "@playwright/test";
import { assertNoPageOverflow, captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";

const viewports = [
  { width: 1280, height: 720 },
  { width: 1280, height: 600 },
  { width: 390, height: 844 },
];

test("@visual-1280 jeu roue : le titre reste dégagé du jeu sur grand et petit écran", async ({ page, baseURL }, info) => {
  await rejectAnalyticsForVisualTests(page.context(), baseURL!);
  await page.route("**/api/public/campaign/template-proof-campaign*", route => route.fulfill({ json: { campaign: { actions: [] } } }));

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/dev/template-rendering-proof?mode=live&template=beauty-nude&business=beauty");
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    const surface = page.locator(".okado-public-experience");
    const heading = surface.locator("h1");
    const wheel = surface.getByTestId("game-wheel-frame");
    await expect(heading).toContainText("Une surprise");
    await expect(wheel).toBeVisible();
    const headingBox = (await heading.boundingBox())!;
    const wheelBox = (await wheel.boundingBox())!;
    expect(wheelBox.y).toBeGreaterThanOrEqual(headingBox.y + headingBox.height);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await assertNoPageOverflow(page);

    if (viewport.width === 1280) {
      await captureVisualAt1280(page, info, `roue-beaute-${viewport.height}`, viewport.height);
    } else {
      await page.screenshot({ path: info.outputPath("roue-beaute-mobile.png"), animations: "disabled" });
    }
  }
});

test("@visual-1280 ticket : la zone à gratter est alignée sans recouvrir le titre", async ({ page, baseURL }, info) => {
  await rejectAnalyticsForVisualTests(page.context(), baseURL!);
  await page.route("**/api/public/campaign/template-proof-campaign*", route => route.fulfill({ json: { campaign: { actions: [] } } }));

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/dev/template-rendering-proof?mode=live&template=beauty-scratch-nude&business=beauty");
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    const surface = page.locator(".okado-public-experience");
    const heading = surface.getByRole("heading", { name: /Une surprise/ });
    const ticket = surface.getByTestId("scratch-ticket-surface");
    await expect(ticket.locator("canvas")).toBeVisible();
    const headingBox = (await heading.boundingBox())!;
    const ticketBox = (await ticket.boundingBox())!;
    expect(ticketBox.y).toBeGreaterThanOrEqual(headingBox.y + headingBox.height);
    if (viewport.width === 390) expect(ticketBox.width).toBeGreaterThan(200);
    if (viewport.width === 390) expect(ticketBox.width).toBeLessThanOrEqual(216);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await assertNoPageOverflow(page);

    if (viewport.width === 1280) {
      await captureVisualAt1280(page, info, `ticket-beaute-${viewport.height}`, viewport.height);
    } else {
      await page.screenshot({ path: info.outputPath("ticket-beaute-mobile.png"), animations: "disabled" });
    }
  }
});

test("game screens marketing : captures joueur réelles sur données synthétiques", async ({ browser }, info) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await context.route("**/api/public/campaign/template-proof-campaign*", route => route.fulfill({ json: { campaign: { actions: [] } } }));
  const page = await context.newPage();
  const models = [
    ["beauty-scratch-nude", "beauty", "game-nude-elegance"],
    ["beauty-scratch-botanical", "beauty", "game-botanique"],
    ["beauty-scratch-noir-or", "beauty", "game-noir-or-ticket"],
    ["beauty-scratch-lilas", "beauty", "game-lilas"],
    ["beauty-pop", "beauty", "game-beauty-pop"],
    ["beauty-editorial", "beauty", "game-noir-or-wheel"],
    ["beauty-nude", "beauty", "game-nude-wheel"],
    ["classic", "restaurant", "game-restaurant"],
    ["scratch-confetti", "retail", "game-commerce"],
  ] as const;
  const headingColors: Record<(typeof models)[number][0], string> = {
    "beauty-scratch-nude": "#48382b",
    "beauty-scratch-botanical": "#334b38",
    "beauty-scratch-noir-or": "#f2e4c5",
    "beauty-scratch-lilas": "#44314d",
    "beauty-pop": "#49313e",
    "beauty-editorial": "#f2e4c5",
    "beauty-nude": "#48382b",
    classic: "#ffffff",
    "scratch-confetti": "#3c3045",
  };
  const wheelButtons: Partial<Record<(typeof models)[number][0], { background: string; text: string }>> = {
    "beauty-pop": { background: "#c52f68", text: "#fff7fa" },
    "beauty-editorial": { background: "#171614", text: "#f4dfaa" },
    "beauty-nude": { background: "#8a6937", text: "#fff9ee" },
  };

  try {
    for (const [template, business, asset] of models) {
      const ink = encodeURIComponent(headingColors[template]);
      const button = wheelButtons[template];
      const buttonQuery = button ? `&button=${encodeURIComponent(button.background)}&buttonText=${encodeURIComponent(button.text)}` : "";
      const backgroundQuery = business === "retail" ? "&background=studio" : "";
      await page.goto(`/dev/template-rendering-proof?mode=live&template=${template}&business=${business}&ink=${ink}${buttonQuery}${backgroundQuery}`);
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
      const surface = page.locator(".okado-public-experience");
      await expect(surface.locator(template.includes("scratch") ? "h2" : "h1")).toBeVisible();
      if (template.includes("scratch")) {
        const ticket = surface.getByTestId("scratch-ticket-surface");
        const foil = ticket.locator("canvas");
        if (await foil.getAttribute("data-foil-texture")) await expect(foil).toHaveAttribute("data-foil-loaded", "true");
        const ticketBox = (await ticket.boundingBox())!;
        const surfaceBox = (await surface.boundingBox())!;
        const centerY = (ticketBox.y + ticketBox.height / 2 - surfaceBox.y) / surfaceBox.height;
        expect(centerY, `${template}: scratch area sits near the middle of the phone`).toBeGreaterThanOrEqual(0.48);
        expect(centerY).toBeLessThanOrEqual(0.64);
        expect(Math.abs(ticketBox.x + ticketBox.width / 2 - surfaceBox.x - surfaceBox.width / 2)).toBeLessThan(2);
      }
      if (!template.includes("scratch")) {
        const title = surface.locator("h1");
        const wheel = surface.getByTestId("game-wheel-frame");
        const titleBox = (await title.boundingBox())!;
        const wheelBox = (await wheel.boundingBox())!;
        expect(wheelBox.y).toBeGreaterThanOrEqual(titleBox.y + titleBox.height);
        if (button) {
          const playButton = surface.getByRole("button", { name: "Jouer à la roue", exact: true });
          await expect(playButton).toHaveAttribute("style", new RegExp(button.background.replace("#", "#"), "i"));
          await expect(playButton).not.toHaveAttribute("style", /#2f6df6|#2563eb/i);
        }
      }
      await expect(page.locator("nextjs-portal")).toHaveCSS("display", "none");
      await page.evaluate(() => document.fonts.ready);
      await surface.screenshot({ path: info.outputPath(`${asset}.png`), animations: "disabled", scale: "device" });
    }
  } finally {
    await context.close();
  }
});
