import { expect, test } from "@playwright/test";
import { blogPosts, publicBlogPosts } from "../src/lib/blog";
import { publicContent } from "../src/lib/public-content";

test("production excludes drafts from routes, listing, sitemap and public links", async ({ request }) => {
  const drafts = blogPosts.filter((post) => post.draft);
  expect(drafts.length).toBeGreaterThan(0);
  const index = await (await request.get("/blog")).text();
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const post of drafts) {
    expect((await request.get(post.path)).status(), post.path).toBe(404);
    expect(index).not.toContain(post.path);
    expect(sitemap).not.toContain(post.path);
  }
  const paths = ["/", "/blog", "/guides", "/restaurants", "/instituts-beaute", "/tarifs", ...publicContent.map((p) => p.path), ...publicBlogPosts.map((p) => p.path)];
  for (const path of paths) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    const html = await response.text();
    for (const draft of drafts) expect(html, path).not.toContain(`href="${draft.path}`);
  }
});

test("approved pilot is visible with valid metadata and incoming links", async ({ page, request }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const slug = "/blog/choisir-lots-jeu-qr-code-commerce";
  const response = await page.goto(slug);
  expect(response?.status()).toBe(200);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://www.okado.app${slug}`);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Trouvez des idées de lots pour votre jeu en magasin : exemples par métier, budget fictif, stocks et conseils pour préparer la remise.");
  await expect(page).toHaveTitle(/Quels lots pour un jeu QR code en magasin/);
  await expect(page.locator('meta[property="article:published_time"]')).toHaveAttribute("content", "2026-11-11");
  await expect(page.getByRole("link", { name: "Essayer Okado gratuitement" })).toHaveAttribute("href", "https://app.okado.app/inscription");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const table = page.getByRole("region", { name: "Budget fictif maximal des lots" });
  await table.focus();
  await expect(table).toBeFocused();
  expect(await table.evaluate((element) => element.scrollWidth)).toBeGreaterThan(await table.evaluate((element) => element.clientWidth));
  await page.screenshot({ path: testInfo.outputPath("pilote-mobile.png"), fullPage: true });
  const graph = (await page.locator('script[type="application/ld+json"]').allTextContents()).flatMap((v) => JSON.parse(v)["@graph"] ?? []);
  expect(graph.find((item) => item["@type"] === "BlogPosting")).toMatchObject({ datePublished: "2026-11-11", headline: "Comment choisir les lots d’un jeu QR code pour son commerce ?" });
  expect(await (await request.get("/sitemap.xml")).text()).toContain(`https://www.okado.app${slug}`);
  for (const path of ["/blog/animer-point-de-vente-qr-code", "/blog/roue-ou-ticket-a-gratter-commerce", "/blog/cout-animation-commerciale-commerce"]) {
    await page.goto(path);
    await expect(page.locator(`a[href="${slug}"]`)).toHaveCount(1);
  }
});
