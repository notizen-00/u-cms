import type { PluginManifest } from "@unej-cms/sdk-plugin";

export const PLUGIN_ID = "unej.page-builder";
export const PLUGIN_VERSION = "1.0.0";

export const manifest: PluginManifest = {
  id: PLUGIN_ID,
  name: "Page Builder",
  version: PLUGIN_VERSION,
  author: { name: "UNEJ CMS Team" },
  description:
    "Editor visual berbasis blok ala WordPress untuk menyusun landing page, profil, galeri, statistik, FAQ, dan konten responsif.",
  license: "UNLICENSED",
  compatibility: {
    cms: { min: "2.0.0" },
    sdk: { min: "1.0.0" },
  },
  capabilities: ["block"],
};
