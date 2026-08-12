import type { ThemeManifest } from "@unej-cms/sdk-theme";

export const THEME_ID = "unej.theme-joy";
export const THEME_VERSION = "1.0.0";

export const manifest: ThemeManifest = {
  id: THEME_ID,
  name: "Joy",
  version: THEME_VERSION,
  author: { name: "UNEJ CMS Team" },
  description:
    "Tema serbaguna: hero mencolok, statistik, navigasi dropdown lebar, dan animasi scroll-reveal. Semua angka dan label adalah pengaturan tema (bukan teks akademik yang dipatri), dan bagian hero/statistik/kartu program beranda hadir sebagai pola Page Builder yang bisa diedit langsung dari halaman — jadi situs bisa mulai sebagai halaman kampus lalu suatu saat dialihkan jadi portal komunitas/konten lain tanpa menyentuh kode tema. Ditulis sebagai komponen Svelte asli, dirender lewat Svelte SSR.",
  license: "UNLICENSED",
  compatibility: {
    cms: { min: "1.0.0" },
    sdk: { min: "1.0.0" },
  },
};
