import type { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blog";
import { publicContent } from "@/lib/public-content";
import { SITE_URL, CONTENT_REVIEWED_AT } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/restaurants",
    "/instituts-beaute",
    "/tarifs",
    "/guides",
    "/blog",
    "/cgv",
    "/campaign/reglement",
    ...publicContent.map((page) => page.path),
    ...blogPosts.map((post) => post.path),
  ];
  return paths.map((path) => ({
    url: new URL(path, SITE_URL).href,
    lastModified: blogPosts.find((post) => post.path === path)?.updatedAt ?? CONTENT_REVIEWED_AT,
  }));
}
