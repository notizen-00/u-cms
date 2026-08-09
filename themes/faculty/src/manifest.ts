import type { ThemeManifest } from "@unej-cms/sdk-theme";

export const THEME_ID = "unej.theme-faculty";
export const THEME_VERSION = "1.0.0";

export const manifest: ThemeManifest = {
  id: THEME_ID,
  name: "Faculty Svelte",
  version: THEME_VERSION,
  author: { name: "UNEJ CMS Team" },
  description:
    "Tema untuk situs fakultas/departemen: hero dengan latar video sinematik, strip logo akreditasi, dan navigasi lebar dengan banyak dropdown. Ditulis sebagai komponen Svelte asli, dirender lewat Svelte SSR.",
  license: "UNLICENSED",
  compatibility: {
    cms: { min: "1.0.0" },
    sdk: { min: "1.0.0" },
  },
};
