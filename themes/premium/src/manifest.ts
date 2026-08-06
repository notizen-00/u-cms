import type { ThemeManifest } from "@unej-cms/sdk-theme";

export const THEME_ID = "unej.theme-premium";
export const THEME_VERSION = "1.0.0";

export const manifest: ThemeManifest = {
  id: THEME_ID,
  name: "Premium",
  version: THEME_VERSION,
  author: { name: "UNEJ CMS Team" },
  description:
    "Tipografi modern, hero section di beranda, grid kartu berita, dan dark mode otomatis mengikuti preferensi sistem pengunjung.",
  license: "UNLICENSED",
  compatibility: {
    cms: { min: "1.0.0" },
    sdk: { min: "1.0.0" },
  },
};
