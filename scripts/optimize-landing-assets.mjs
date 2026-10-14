import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destination = path.join(root, "apps/landing-page/public/images");
const samples = [
  "beauty-nude-elegance",
  "beauty-botanical-premium",
  "beauty-noir-or",
  "beauty-lilas-soin-doux",
  "beauty-corail-lumiere",
];
for (const sample of samples) {
  await sharp(
    path.join(
      root,
      "apps/web-app/public/images/scratch-templates",
      `${sample}.webp`,
    ),
  )
    .resize({ width: 480, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(path.join(destination, `sample-${sample}.webp`));
}
await sharp(path.join(destination, "restaurant-a5-counter.png"))
  .resize({ width: 1600, fit: "inside", withoutEnlargement: true })
  .webp({ quality: 82 })
  .toFile(path.join(destination, "restaurant-a5-counter.webp"));
console.log("Marketing media generated from the versioned product assets.");
