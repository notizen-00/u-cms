import type { ThemeManifest } from "@unej-cms/sdk-theme";

export const THEME_ID = "unej.theme-university";
export const THEME_VERSION = "1.0.0";

export const manifest: ThemeManifest = {
  id: THEME_ID,
  name: "University",
  version: THEME_VERSION,
  author: { name: "UNEJ CMS Team" },
  description:
    "Tema institusi pendidikan: hero dengan statistik akademik, grid program studi/fakultas, berita kampus, dan animasi scroll-reveal. Ditulis sebagai komponen Svelte asli, dirender lewat Svelte SSR.",
  license: "UNLICENSED",
  compatibility: {
    cms: { min: "1.0.0" },
    sdk: { min: "1.0.0" },
  },
};
