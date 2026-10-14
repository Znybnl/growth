import type { MetadataRoute } from "next";
import { publicContent } from "@/lib/public-content";
import { SITE_URL, CONTENT_REVIEWED_AT } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/restaurants",
    "/instituts-beaute",
    "/tarifs",
    "/guides",
    "/cgv",
    "/campaign/reglement",
    ...publicContent.map((page) => page.path),
  ];
  return paths.map((path) => ({
    url: new URL(path, SITE_URL).href,
    lastModified: CONTENT_REVIEWED_AT,
  }));
}
