import type { PluginManifest } from "@unej-cms/sdk-plugin";

export const PLUGIN_ID = "unej.wordpress-import";
export const PLUGIN_VERSION = "1.0.0";

export const manifest: PluginManifest = {
  id: PLUGIN_ID,
  name: "WordPress Import",
  version: PLUGIN_VERSION,
  author: { name: "UNEJ CMS Team" },
  description:
    "Imports posts, pages, categories, tags, and media from a WordPress WXR (.xml) export into a site.",
  license: "UNLICENSED",
  compatibility: {
    cms: { min: "2.0.0" },
    sdk: { min: "1.0.0" },
  },
  capabilities: ["permission", "storage", "event"],
};
