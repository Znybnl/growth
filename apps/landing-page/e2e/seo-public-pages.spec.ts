import { expect, test } from "@playwright/test";
import { blogPosts } from "../src/lib/blog";
import { publicContent } from "../src/lib/public-content";
import { ANALYTICS_CONSENT_COOKIE, ANALYTICS_CONSENT_VERSION } from "../src/lib/analytics-consent";

const routes = [
  "/",
  "/restaurants",
  "/instituts-beaute",
  "/cgv",
  "/campaign/reglement",
  "/tarifs",
  "/guides",
  "/blog",
  ...publicContent.map((page) => page.path),
  ...blogPosts.map((post) => post.path),
];

test("chaque page publique : HTML indexable, canonical, image sociale et navigation mobile", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const titles = new Set<string>();
  const internalLinks = new Set<string>();
  for (const route of routes) {
    expect((await page.goto(route))?.status(), route).toBe(200);
    await expect(page.locator("h1"), route).toHaveCount(1);
    await expect(page.locator("main#contenu"), route).toHaveCount(1);
    const title = await page.title();
    expect(titles.has(title), `Titre unique : ${route}`).toBe(false);
    titles.add(title);
    const canonical = await page
      .locator('link[rel="canonical"]')
      .getAttribute("href");
    expect(new URL(canonical!).href).toBe(
      new URL(route, "https://www.okado.app").href,
    );
    expect(
      await page
        .locator('meta[name="robots"]')
        .evaluateAll((metas) => metas[0]?.getAttribute("content") ?? ""),
    ).not.toContain("noindex");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      "https://www.okado.app/og-image.png",
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /.{30,}/,
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      route,
    ).toBeLessThanOrEqual(page.viewportSize()!.width);
    for (const href of await page
      .locator('a[href^="/"]')
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")!)))
      internalLinks.add(href.split("#")[0]);
    for (const script of await page
      .locator('script[type="application/ld+json"]')
      .allTextContents())
      expect(() => JSON.parse(script)).not.toThrow();
    if (
      [
        "/",
        "/tarifs",
        "/ticket-a-gratter",
        "/guides/mesurer-jeu-qr-code",
        "/blog",
      ].includes(route)
    )
      await page.screenshot({
        path: testInfo.outputPath(
          `${route.replaceAll("/", "-") || "home"}.png`,
        ),
        fullPage: true,
      });
  }
  for (const path of internalLinks)
    expect(routes, `Lien interne valide : ${path}`).toContain(path);
  expect(errors).toEqual([]);
});

test("le blog utilise un gabarit commun sans commentaires", async ({ page }) => {
  await page.goto("/blog");
  for (const post of blogPosts)
    await expect(page.getByRole("link", { name: post.title, exact: true })).toHaveCount(1);

  for (const route of ["/blog", ...blogPosts.map((post) => post.path)]) {
    await page.goto(route);
    await expect(page.locator("main#contenu")).toHaveCount(1);
    await expect(page.locator("form")).toHaveCount(0);
    await expect(page.getByText("Commentaire", { exact: false })).toHaveCount(0);
  }
  await page.goto(blogPosts[0].path);
  await expect(page.locator("article")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(blogPosts[0].title);
  await expect(page.getByText("À retenir", { exact: true })).toBeVisible();
});

test("sitemap, robots, OG et fichiers distribués sont utilisables", async ({
  request,
}) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(
    "Sitemap: https://www.okado.app/sitemap.xml",
  );
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect([...xml.matchAll(/<loc>/g)]).toHaveLength(routes.length);
  for (const route of routes)
    expect(xml).toContain(
      `https://www.okado.app${route === "/" ? "/" : route}</loc>`,
    );
  const image = await request.get("/og-image.png");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");
  expect((await image.body()).subarray(0, 8).toString("hex")).toBe(
    "89504e470d0a1a0a",
  );
  expect((await image.body()).readUInt32BE(16)).toBe(1200);
  expect((await image.body()).readUInt32BE(20)).toBe(630);
  for (const imagePath of [
    "restaurant-a5-counter.webp",
    "sample-beauty-nude-elegance.webp",
    "sample-beauty-botanical-premium.webp",
    "sample-beauty-noir-or.webp",
    "sample-beauty-lilas-soin-doux.webp",
    "sample-beauty-corail-lumiere.webp",
  ]) {
    const response = await request.get(`/images/${imagePath}`);
    expect(response.status(), imagePath).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/webp");
    expect((await response.body()).length, imagePath).toBeLessThan(300_000);
  }
  const optimized = await request.get(
    "/_next/image?url=%2Fimages%2Frestaurant-a5-counter.webp&w=640&q=75",
  );
  expect(optimized.status()).toBe(200);
  for (const path of ["/page-inconnue-test-seo", "/guides/guide-inexistant-test-seo", "/blog/article-inexistant-test-seo", "/fichier-inconnu-test-seo.png"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});

test("la démonstration reste indépendante de l’avis et ne transmet aucune coordonnée", async ({
  page,
  baseURL,
}) => {
  // This scenario checks the demo after refusal. Consent itself has its own suite.
  await page.context().addCookies([{
    name: ANALYTICS_CONSENT_COOKIE,
    value: encodeURIComponent(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "rejected", decidedAt: Date.now() })),
    url: baseURL!,
  }]);
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") mutations.push(request.url());
  });
  await page.goto("/");
  await expect(
    page.getByText("Démo : aucun lot réel", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await page
    .getByRole("button", { name: "Jouer maintenant" })
    .click();
  await expect(
    page.getByRole("button", { name: "Recevoir mon gain" }),
  ).toBeVisible();
  await page.getByLabel("Prénom de démonstration").fill("Camille");
  await page.getByLabel("E-mail de démonstration").fill("demo@example.com");
  await page.getByRole("button", { name: "Recevoir mon gain" }).click();
  await expect(
    page.getByRole("heading", { name: "Votre gain est confirmé !", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Redémarrer la démo" }).click();
  await expect(
    page.getByRole("button", { name: "Jouer", exact: true }),
  ).toBeEnabled();
  expect(mutations).toEqual([]);
});

test("la photo restaurant et les décors de tickets se chargent dans le navigateur", async ({
  page,
}, testInfo) => {
  for (const path of [
    "/restaurants",
    "/instituts-beaute",
    "/ticket-a-gratter",
  ]) {
    await page.goto(path);
    for (const img of await page.locator("main img").all()) {
      await img.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          img.evaluate(
            (element: HTMLImageElement) =>
              element.complete && element.naturalWidth > 0,
          ),
        )
        .toBe(true);
    }
    await page
      .locator("main img")
      .first()
      .screenshot({ path: testInfo.outputPath(`${path.slice(1)}-media.png`) });
  }
});

test("le prix France et Canada ne crée pas de divergence d’hydratation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/tarifs?country=CA");
  await expect(page.getByText("29 $", { exact: true })).toBeVisible();
  await page.goto("/tarifs?country=FR");
  await expect(page.getByText("20 €", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
