import assert from "node:assert/strict";
import test from "node:test";

import sharp from "sharp";

import {
  MAX_MERCHANT_IMAGE_SOURCE_BYTES,
  MerchantImageValidationError,
  optimizeMerchantImage,
} from "./merchant-image-processing.ts";
import { getMerchantOptimizedImageDimensions, isMerchantOptimizedImageUrl } from "./merchant-image-upload.ts";

test("optimizes a transparent logo to correctly sized WebP without metadata", async () => {
  const source = await sharp({
    create: {
      width: 420,
      height: 210,
      channels: 4,
      background: { r: 235, g: 90, b: 125, alpha: 0.6 },
    },
  }).png().withMetadata({ exif: { IFD0: { Artist: "test" } } }).toBuffer();

  const result = await optimizeMerchantImage(source, "logo");
  const metadata = await sharp(result.buffer).metadata();

  assert.equal(metadata.format, "webp");
  assert.equal(result.width, 420);
  assert.equal(result.height, 210);
  assert.equal(metadata.hasAlpha, true);
  assert.equal(metadata.exif, undefined);
  assert.ok(result.buffer.byteLength <= 500 * 1024);
});

test("auto-orients JPEG input and never enlarges a small image", async () => {
  const source = await sharp({
    create: {
      width: 80,
      height: 40,
      channels: 3,
      background: { r: 180, g: 150, b: 130 },
    },
  }).jpeg().withMetadata({ orientation: 6 }).toBuffer();

  const result = await optimizeMerchantImage(source, "background");
  assert.equal(result.width, 40);
  assert.equal(result.height, 80);
});

test("adaptively reduces quality or dimensions to enforce final byte caps", async () => {
  const width = 900;
  const height = 900;
  const pixels = Buffer.alloc(width * height * 3);
  let seed = 0x12345678;
  for (let index = 0; index < pixels.length; index += 1) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    pixels[index] = seed & 0xff;
  }
  const source = await sharp(pixels, {
    raw: { width, height, channels: 3 },
  }).png().toBuffer();
  assert.ok(source.byteLength < MAX_MERCHANT_IMAGE_SOURCE_BYTES);

  const result = await optimizeMerchantImage(source, "logo");
  assert.ok(result.buffer.byteLength <= 500 * 1024);
  assert.ok(result.width <= 800 && result.height <= 800);
});

test("rejects spoofed, unsupported, oversized and excessive-dimension images", async () => {
  await assert.rejects(
    optimizeMerchantImage(Buffer.from("not an image"), "logo"),
    MerchantImageValidationError,
  );

  const gif = await sharp({
    create: { width: 12, height: 12, channels: 3, background: "white" },
  }).gif().toBuffer();
  await assert.rejects(optimizeMerchantImage(gif, "logo"), /PNG, JPEG ou WebP/);

  await assert.rejects(
    optimizeMerchantImage(Buffer.alloc(MAX_MERCHANT_IMAGE_SOURCE_BYTES + 1), "logo"),
    /4 Mo maximum/,
  );

  const tooWide = await sharp({
    create: { width: 10_001, height: 2, channels: 3, background: "white" },
  }).png().toBuffer();
  await assert.rejects(optimizeMerchantImage(tooWide, "logo"), /dimensions.*limite/i);
});

test("recognizes only managed image URLs and extracts stored intrinsic dimensions", () => {
  const url = "https://example.supabase.co/storage/v1/object/public/merchant-images/merchant_1/550e8400-e29b-41d4-a716-446655440000_800x400.webp";
  assert.equal(isMerchantOptimizedImageUrl(url), true);
  assert.deepEqual(getMerchantOptimizedImageDimensions(url), { width: 800, height: 400 });
  assert.equal(isMerchantOptimizedImageUrl("https://example.com/logo.webp"), false);
  assert.equal(getMerchantOptimizedImageDimensions("https://example.com/logo.webp"), null);
});
