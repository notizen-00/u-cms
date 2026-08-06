import type { ThemeManifest } from "@unej-cms/sdk-theme";

export const THEME_ID = "unej.theme-default";
export const THEME_VERSION = "1.0.0";

export const manifest: ThemeManifest = {
  id: THEME_ID,
  name: "Default",
  version: THEME_VERSION,
  author: { name: "UNEJ CMS Team" },
  description:
    "Tema bawaan UNEJ CMS: layout minimal untuk beranda, daftar berita, detail berita, dan halaman statis.",
  license: "UNLICENSED",
  compatibility: {
    cms: { min: "1.0.0" },
    sdk: { min: "1.0.0" },
  },
};
