import { describe, expect, it } from "vitest";
import {
  MediaProcessingError,
  defineMediaUploadProcessor,
  type MediaUploadAsset,
} from "./processor.js";

const asset: MediaUploadAsset = {
  data: new Uint8Array([1, 2, 3]),
  originalName: "photo.jpg",
  storageName: "photo.jpg",
  mimeType: "image/jpeg",
};

describe("defineMediaUploadProcessor", () => {
  it("normalises the id and freezes the definition", () => {
    const processor = defineMediaUploadProcessor({
      id: "  example.optimise  ",
      supports: () => true,
      process: (value) => value,
    });

    expect(processor.id).toBe("example.optimise");
    expect(Object.isFrozen(processor)).toBe(true);
    expect(() => {
      // @ts-expect-error readonly at the type level as well as runtime
      processor.id = "other";
    }).toThrow(TypeError);
  });

  it("rejects an empty id and a non-integer priority", () => {
    expect(() =>
      defineMediaUploadProcessor({
        id: " ",
        supports: () => true,
        process: (value) => value,
      }),
    ).toThrow("must not be empty");

    expect(() =>
      defineMediaUploadProcessor({
        id: "example.invalid-priority",
        priority: 1.5,
        supports: () => true,
        process: (value) => value,
      }),
    ).toThrow("finite integer");
  });

  it("supports asynchronous transformations", async () => {
    const processor = defineMediaUploadProcessor({
      id: "example.rename",
      supports: (value) => value.mimeType === "image/jpeg",
      async process(value) {
        return {
          ...value,
          storageName: "photo.avif",
          mimeType: "image/avif",
        };
      },
    });

    expect(processor.supports(asset)).toBe(true);
    await expect(processor.process(asset, { siteId: "site-1" })).resolves.toMatchObject({
      storageName: "photo.avif",
      mimeType: "image/avif",
    });
  });
});

describe("MediaProcessingError", () => {
  it("retains the processor id without exposing its cause in the message", () => {
    const cause = new Error("native codec details");
    const error = new MediaProcessingError(
      "example.optimise",
      "Image could not be processed",
      { cause },
    );

    expect(error.name).toBe("MediaProcessingError");
    expect(error.processorId).toBe("example.optimise");
    expect(error.message).toBe("Image could not be processed");
    expect(error.cause).toBe(cause);
  });
});
