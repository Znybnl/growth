import assert from "node:assert/strict";
import test from "node:test";

import sharp from "sharp";
import { resolvePosterLogoSource } from "./poster-logo-source.ts";

test("poster SVG prefers the loaded inline logo over the saved remote URL", async () => {
  const logo = await sharp({
    create: { width: 8, height: 8, channels: 4, background: { r: 207, g: 0, b: 96, alpha: 1 } },
  }).png().toBuffer();
  const imageSource = `data:image/png;base64,${logo.toString("base64")}`;
  const resolvedSource = resolvePosterLogoSource(
    "image",
    imageSource,
    "https://storage.example.test/logo.webp",
    "https://storage.example.test/campaign-logo.webp",
  );
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><image href="${resolvedSource}" width="32" height="32"/></svg>`);
  const png = await sharp(svg, { failOn: "error" }).png().toBuffer();
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });

  assert.equal(resolvedSource, imageSource);
  assert.equal(info.width, 32);
  assert.deepEqual([...data.subarray(0, 4)], [207, 0, 96, 255]);
});

test("poster SVG does not render a campaign logo when poster logo mode is not image", () => {
  assert.equal(resolvePosterLogoSource("text", undefined, undefined, "https://storage.test/logo.webp"), undefined);
  assert.equal(resolvePosterLogoSource("none", undefined, undefined, "https://storage.test/logo.webp"), undefined);
});
