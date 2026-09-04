import type { TextFont } from "@/lib/types";

export type PosterFontAsset = {
  familyName: string;
  fileName: string;
  fontWeight: string;
};

const POSTER_FONT_ASSETS: Partial<Record<TextFont, PosterFontAsset>> = {
  roboto: { familyName: "Roboto", fileName: "roboto.ttf", fontWeight: "100 900" },
  // Geogrotesque is currently rendered with the Roboto fallback in the web app.
  geogrotesque: { familyName: "Geogrotesque", fileName: "roboto.ttf", fontWeight: "100 900" },
  comfortaa: { familyName: "Comfortaa", fileName: "comfortaa.ttf", fontWeight: "100 900" },
  "days-one": { familyName: "Days One", fileName: "days-one.ttf", fontWeight: "400" },
  "delius-unicase": {
    familyName: "Delius Unicase",
    fileName: "delius-unicase.ttf",
    fontWeight: "400",
  },
  lato: { familyName: "Lato", fileName: "lato-900.ttf", fontWeight: "900" },
  lobster: { familyName: "Lobster", fileName: "lobster.ttf", fontWeight: "400" },
  pacifico: { familyName: "Pacifico", fileName: "pacifico.ttf", fontWeight: "400" },
  syncopate: { familyName: "Syncopate", fileName: "syncopate-700.ttf", fontWeight: "700" },
  anton: { familyName: "Anton", fileName: "../anton-regular.ttf", fontWeight: "400" },
  display: { familyName: "Anton", fileName: "../anton-regular.ttf", fontWeight: "400" },
  cormorant: {
    familyName: "Cormorant Garamond",
    fileName: "cormorant-garamond.ttf",
    fontWeight: "100 900",
  },
  fredoka: { familyName: "Fredoka", fileName: "fredoka.ttf", fontWeight: "100 900" },
  inter: { familyName: "Inter", fileName: "../inter-variable.ttf", fontWeight: "100 900" },
  bebas: { familyName: "Bebas Neue", fileName: "bebas-neue.ttf", fontWeight: "400" },
  sans: { familyName: "Inter", fileName: "../inter-variable.ttf", fontWeight: "100 900" },
};

export function getPosterFontAsset(font: TextFont) {
  return POSTER_FONT_ASSETS[font];
}

export function getPosterFontSourceUrl(font: TextFont) {
  const asset = getPosterFontAsset(font);
  return asset ? `/fonts/poster/${asset.fileName}` : undefined;
}
