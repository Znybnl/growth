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
