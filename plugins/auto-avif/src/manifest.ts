import type { PluginManifest } from "@unej-cms/sdk-plugin";

export const PLUGIN_ID = "unej.auto-avif";
export const PLUGIN_VERSION = "1.0.0";

export const manifest: PluginManifest = {
  id: PLUGIN_ID,
  name: "Auto Convert to AVIF",
  version: PLUGIN_VERSION,
  author: { name: "UNEJ CMS Team" },
  description:
    "Automatically converts static JPEG, PNG, and WebP media uploads to efficient AVIF images.",
  license: "UNLICENSED",
  compatibility: {
    cms: { min: "2.0.0" },
    sdk: { min: "1.0.0" },
  },
  capabilities: ["media-transform"],
};
