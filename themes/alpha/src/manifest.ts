import type { ThemeManifest } from "@unej-cms/sdk-theme";

export const THEME_ID = "unej.theme-alpha";
export const THEME_VERSION = "1.0.0";

export const manifest: ThemeManifest = {
  id: THEME_ID,
  name: "Alpha Tactical",
  version: THEME_VERSION,
  author: { name: "UNEJ CMS Team" },
  description:
    "Tema bernuansa gelap ala portal game battle royale/esports: hero layar penuh dengan latar gambar/video sinematik, pita statistik besar, dan grid mode/fitur bersudut tajam. Ditulis sebagai komponen Svelte asli, dirender lewat Svelte SSR.",
  license: "UNLICENSED",
  compatibility: {
    cms: { min: "1.0.0" },
    sdk: { min: "1.0.0" },
  },
};
