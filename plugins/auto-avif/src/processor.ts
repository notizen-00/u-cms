import {
  MediaProcessingError,
  defineMediaUploadProcessor,
  type MediaUploadAsset,
} from "@unej-cms/sdk-media";
import sharp from "sharp";
import { PLUGIN_ID } from "./manifest.js";

export const AVIF_MIME_TYPE = "image/avif";
export const AVIF_QUALITY = 55;
export const AVIF_EFFORT = 4;
export const MAX_INPUT_PIXELS = 40_000_000;
export const AVIF_PROCESSOR_ID = `${PLUGIN_ID}.upload`;

const INPUT_FORMAT_BY_MIME_TYPE = new Map<string, string>([
  ["image/jpeg", "jpeg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function toAvifStorageName(fileName: string): string {
  const normalised = fileName.replace(/\\/g, "/");
  const baseName = normalised.slice(normalised.lastIndexOf("/") + 1) || "image";
  const withoutExtension = baseName.replace(/\.[^./]+$/, "") || "image";
  return `${withoutExtension}.avif`;
}

function assertMatchingInputFormat(
  asset: MediaUploadAsset,
  actualFormat: string | undefined,
): void {
  const expectedFormat = INPUT_FORMAT_BY_MIME_TYPE.get(asset.mimeType);
  if (!expectedFormat || actualFormat !== expectedFormat) {
    throw new MediaProcessingError(
      AVIF_PROCESSOR_ID,
      "Image content does not match its declared file type.",
    );
  }
}

export const avifUploadProcessor = defineMediaUploadProcessor({
  id: AVIF_PROCESSOR_ID,
  priority: 10,
  supports: (asset) => INPUT_FORMAT_BY_MIME_TYPE.has(asset.mimeType),
  async process(asset) {
    try {
      const metadata = await sharp(asset.data, {
        animated: true,
        failOn: "error",
        limitInputPixels: MAX_INPUT_PIXELS,
        sequentialRead: true,
      }).metadata();

      assertMatchingInputFormat(asset, metadata.format);

      // AVIF image sequences are not supported by Sharp. Preserve animated
      // WebP/APNG uploads instead of silently reducing them to the first frame.
      if ((metadata.pages ?? 1) > 1) {
        return asset;
      }

      const { data, info } = await sharp(asset.data, {
        failOn: "error",
        limitInputPixels: MAX_INPUT_PIXELS,
        sequentialRead: true,
      })
        .autoOrient()
        .toColourspace("srgb")
        .avif({ quality: AVIF_QUALITY, effort: AVIF_EFFORT })
        .toUint8Array();

      if (data.byteLength === 0 || !info.width || !info.height) {
        throw new MediaProcessingError(
          AVIF_PROCESSOR_ID,
          "AVIF conversion produced an invalid image.",
        );
      }

      return {
        data,
        originalName: asset.originalName,
        storageName: toAvifStorageName(asset.storageName),
        mimeType: AVIF_MIME_TYPE,
        width: info.width,
        height: info.height,
      };
    } catch (error) {
      if (error instanceof MediaProcessingError) {
        throw error;
      }
      throw new MediaProcessingError(
        AVIF_PROCESSOR_ID,
        "Image could not be converted to AVIF. The file may be corrupt or too large.",
        { cause: error },
      );
    }
  },
});
