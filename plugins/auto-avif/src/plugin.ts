import { definePlugin } from "@unej-cms/sdk-plugin";
import { manifest } from "./manifest.js";
import { avifUploadProcessor } from "./processor.js";

export const autoAvifPlugin = definePlugin({
  manifest,
  media: {
    uploadProcessors: [avifUploadProcessor],
  },
});
