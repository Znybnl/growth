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
  test.setTimeout(60_000);
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
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(ogImage).toEqual(
      blogPosts.some((post) => post.path === route)
        ? expect.stringContaining("https://www.okado.app/images/blog/")
        : "https://www.okado.app/og-image.png",
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
    await expect(page.getByRole("heading", { name: "Pour aller plus loin", exact: true })).toHaveCount(0);
    await expect(page.getByText("Google Search Central", { exact: false })).toHaveCount(0);
  }
  for (const post of blogPosts) {
    await page.goto(post.path);
    await expect(page.getByAltText(post.imageAlt!, { exact: true })).toBeVisible();
  }
  await page.goto(blogPosts[0].path);
  await expect(page.locator("article")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(blogPosts[0].title);
  await expect(page.getByText(blogPosts[0].answer!, { exact: true })).toBeVisible();
  const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(structuredData.join("\n")).toContain('"@type":"BlogPosting"');
  expect(structuredData.join("\n")).toContain('"author"');
  expect(structuredData.join("\n")).toContain('"image"');
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
  for (const post of blogPosts) {
    const imagePath = post.image!;
    const response = await request.get(imagePath);
    expect(response.status(), imagePath).toBe(200);
    expect(response.headers()["content-type"], imagePath).toContain("image/webp");
  }
  const optimized = await request.get(
    "/_next/image?url=%2Fimages%2Frestaurant-a5-counter.webp&w=640&q=75",
  );
  expect(optimized.status()).toBe(200);
  for (const path of ["/page-inconnue-test-seo", "/guides/guide-inexistant-test-seo", "/blog/article-inexistant-test-seo", "/fichier-inconnu-test-seo.png"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});

test("les 20 articles exposent liens, sources et métadonnées cohérentes dans le HTML", async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  expect(blogPosts).toHaveLength(20);
  const descriptions = new Set<string>();
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const post of blogPosts) {
    const response = await page.goto(post.path);
    expect(response?.status(), post.path).toBe(200);
    const html = await response!.text();
    const article = page.locator("article");
    expect(await article.innerText(), post.path).not.toMatch(/\[[^\]]+\]\([^)]+\)/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(post.title);
    expect(await page.title()).toContain(post.seoTitle ?? post.title);
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(description).toBe(post.description);
    expect(descriptions.has(description!)).toBe(false);
    descriptions.add(description!);
    await expect(page.locator('meta[property="article:modified_time"]')).toHaveAttribute("content", post.updatedAt);
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", `https://www.okado.app${post.image}`);
    await expect(page.getByRole("navigation", { name: "Fil d’Ariane" }).locator('[aria-current="page"]')).toHaveText(post.title);
    await expect(page.getByText("Mis à jour le", { exact: false })).toContainText("18 octobre 2026");

    const inlineTexts = post.sections.flatMap((section) => [
      ...section.paragraphs,
      ...(section.items ?? []),
      ...(section.table?.rows.flat() ?? []),
    ]);
    for (const value of inlineTexts) {
      for (const [, label, href] of value.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
        const link = article.locator(`a[href="${href}"]`).filter({ hasText: label });
        expect(await link.count(), `${post.path} : ${label}`).toBeGreaterThan(0);
        // Links must be present in server HTML, not inserted only after hydration.
        expect(html).toContain(`href="${href}"`);
      }
    }
    expect(post.source?.length, post.path).toBeGreaterThan(0);
    await expect(article.getByRole("heading", { name: "Sources et références" })).toBeVisible();
    for (const source of post.source ?? []) {
      await expect(article.getByRole("link", { name: source.label, exact: true })).toHaveAttribute("href", source.href);
      expect(new URL(source.href).protocol).toBe("https:");
      expect(source.href).not.toContain("developers.google.com/search");
    }
    for (const section of post.sections.filter((section) => section.table)) {
      const table = article.getByRole("table", { name: section.table!.caption });
      await expect(table).toBeVisible();
      expect(await table.locator('th[scope="col"]').count()).toBe(section.table!.headers.length);
      expect(await table.locator('th[scope="row"]').count()).toBe(section.table!.rows.length);
      const region = article.getByRole("region", { name: section.table!.caption });
      await region.focus();
      await expect(region).toBeFocused();
      if (page.viewportSize()!.width <= 390) {
        await page.keyboard.press("ArrowRight");
        expect(await region.evaluate((element) => element.scrollWidth)).toBeGreaterThan(await region.evaluate((element) => element.clientWidth));
      }
      if (["/blog/idees-animations-commerciales-boutique", "/blog/cout-animation-commerciale-commerce"].includes(post.path)) {
        await region.screenshot({ path: testInfo.outputPath(`${post.path.split("/").pop()}-table.png`) });
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth), post.path).toBeLessThanOrEqual(page.viewportSize()!.width);
    const graph = (await page.locator('script[type="application/ld+json"]').allTextContents())
      .flatMap((value) => JSON.parse(value)["@graph"] ?? []);
    const schema = graph.find((item) => item["@type"] === "BlogPosting");
    expect(schema).toMatchObject({
      headline: post.title,
      description: post.description,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: { "@type": "Organization", name: post.author },
      image: [`https://www.okado.app${post.image}`],
    });
    expect(graph.find((item) => item["@type"] === "BreadcrumbList").itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Okado", item: "https://www.okado.app/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.okado.app/blog" },
      { "@type": "ListItem", position: 3, name: post.title, item: `https://www.okado.app${post.path}` },
    ]);
    expect(sitemap).toContain(`<loc>https://www.okado.app${post.path}</loc>\n<lastmod>${post.updatedAt}</lastmod>`);
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
