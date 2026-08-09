import { describe, expect, it } from "vitest";
import sharp from "sharp";
import type { MediaUploadAsset } from "@unej-cms/sdk-media";
import {
  AVIF_MIME_TYPE,
  AVIF_PROCESSOR_ID,
  avifUploadProcessor,
} from "./processor.js";

async function createImage(format: "jpeg" | "png" | "webp", alpha = 1) {
  const pipeline = sharp({
    create: {
      width: 8,
      height: 5,
      channels: 4,
      background: { r: 25, g: 100, b: 210, alpha },
    },
  });
  const { data } = await pipeline[format]().toUint8Array();
  return data;
}

function asset(data: Uint8Array, mimeType: string, name = "campus.photo.jpg"): MediaUploadAsset {
  return {
    data,
    originalName: name,
    storageName: name,
    mimeType,
  };
}

describe("avifUploadProcessor", () => {
  it.each([
    ["jpeg", "image/jpeg"],
    ["png", "image/png"],
    ["webp", "image/webp"],
  ] as const)("converts a static %s upload to AVIF", async (format, mimeType) => {
    const input = asset(await createImage(format), mimeType);
    const result = await avifUploadProcessor.process(input, { siteId: "site-1" });
    const metadata = await sharp(result.data).metadata();

    expect(result.mimeType).toBe(AVIF_MIME_TYPE);
    expect(result.originalName).toBe("campus.photo.jpg");
    expect(result.storageName).toBe("campus.photo.avif");
    expect(result.width).toBe(8);
    expect(result.height).toBe(5);
    expect(metadata.format).toBe("heif");
    expect(metadata.compression).toBe("av1");
  });

  it("preserves transparency", async () => {
    const input = asset(await createImage("png", 0.25), "image/png", "logo.png");
    const result = await avifUploadProcessor.process(input, { siteId: "site-1" });
    const metadata = await sharp(result.data).metadata();

    expect(metadata.hasAlpha).toBe(true);
  });

  it.each(["image/gif", "image/svg+xml", "application/pdf", "image/avif"])(
    "does not claim unsupported %s uploads",
    (mimeType) => {
      expect(avifUploadProcessor.supports(asset(new Uint8Array([1]), mimeType))).toBe(false);
    },
  );

  it("skips animated WebP without dropping frames", async () => {
    const frames = await Promise.all([
      sharp({
        create: {
          width: 4,
          height: 3,
          channels: 4,
          background: { r: 20, g: 80, b: 160, alpha: 1 },
        },
      })
        .png()
        .toBuffer(),
      sharp({
        create: {
          width: 4,
          height: 3,
          channels: 4,
          background: { r: 160, g: 80, b: 20, alpha: 1 },
        },
      })
        .png()
        .toBuffer(),
    ]);
    const { data } = await sharp(frames, { join: { animated: true } })
      .webp({ delay: [50, 50], loop: 0 })
      .toUint8Array();
    const input = asset(data, "image/webp", "animation.webp");

    const result = await avifUploadProcessor.process(input, { siteId: "site-1" });

    expect(result).toBe(input);
    expect(result.mimeType).toBe("image/webp");
  });

  it("rejects corrupt or MIME-mismatched raster input without fallback", async () => {
    const png = await createImage("png");

    await expect(
      avifUploadProcessor.process(asset(png, "image/jpeg"), { siteId: "site-1" }),
    ).rejects.toMatchObject({
      name: "MediaProcessingError",
      processorId: AVIF_PROCESSOR_ID,
    });

    await expect(
      avifUploadProcessor.process(asset(new Uint8Array([1, 2, 3]), "image/jpeg"), {
        siteId: "site-1",
      }),
    ).rejects.toThrow("could not be converted to AVIF");
  });
});
