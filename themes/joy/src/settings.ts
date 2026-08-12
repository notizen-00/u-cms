import { definePropertySchema, type PropertySchema } from "@unej-cms/sdk-ui";

export const DEFAULT_PRIMARY_COLOR = "#7c3aed";
export const DEFAULT_SECONDARY_COLOR = "#f43f5e";
export const DEFAULT_HERO_TAGLINE =
  "Tulis tagline singkat yang menjelaskan situs Anda di sini.";
export const DEFAULT_HERO_BADGE_TEXT = "Terverifikasi & Tepercaya";
export const DEFAULT_STAT1_VALUE = "3";
export const DEFAULT_STAT1_LABEL = "Program";
export const DEFAULT_STAT2_VALUE = "49";
export const DEFAULT_STAT2_LABEL = "Kontributor";
export const DEFAULT_STAT3_VALUE = "1.365";
export const DEFAULT_STAT3_LABEL = "Anggota Aktif";
export const DEFAULT_STAT4_VALUE = "15+";
export const DEFAULT_STAT4_LABEL = "Tahun Berjalan";
export const DEFAULT_META_KEYWORDS = "situs resmi, komunitas, informasi terbaru";

/**
 * Configurable per-site options (admin-editable via the Dashboard's theme
 * settings panel). Unlike university's theme (which hardcodes stat labels
 * like "Mahasiswa Aktif" in the Svelte template and only exposes the
 * numbers), every stat here is a free-text value/label pair — this theme is
 * meant to be reusable well beyond a campus site, so nothing about "what
 * the numbers mean" is baked into the component.
 */
export const settings: PropertySchema = definePropertySchema({
  primaryColor: {
    type: "color",
    label: "Warna Utama",
    description: "Warna identitas utama — tombol, tautan aktif, aksen.",
    default: DEFAULT_PRIMARY_COLOR,
  },
  secondaryColor: {
    type: "color",
    label: "Warna Sekunder",
    description: "Warna aksen kedua — dipakai pada badge dan sorotan.",
    default: DEFAULT_SECONDARY_COLOR,
  },
  heroTagline: {
    type: "string",
    label: "Tagline Hero",
    description: "Kalimat pengantar di bawah nama situs pada bagian hero beranda.",
    default: DEFAULT_HERO_TAGLINE,
  },
  heroImage: {
    type: "media",
    label: "Gambar Latar Hero",
    description: "Gambar latar pada bagian hero beranda (opsional).",
  },
  heroBadgeText: {
    type: "string",
    label: "Teks Badge Hero",
    description: "Ditampilkan sebagai badge kecil di atas judul hero, mis. \"Terverifikasi & Tepercaya\".",
    default: DEFAULT_HERO_BADGE_TEXT,
  },
  stat1Value: { type: "string", label: "Statistik 1 — Angka", default: DEFAULT_STAT1_VALUE },
  stat1Label: { type: "string", label: "Statistik 1 — Label", default: DEFAULT_STAT1_LABEL },
  stat2Value: { type: "string", label: "Statistik 2 — Angka", default: DEFAULT_STAT2_VALUE },
  stat2Label: { type: "string", label: "Statistik 2 — Label", default: DEFAULT_STAT2_LABEL },
  stat3Value: { type: "string", label: "Statistik 3 — Angka", default: DEFAULT_STAT3_VALUE },
  stat3Label: { type: "string", label: "Statistik 3 — Label", default: DEFAULT_STAT3_LABEL },
  stat4Value: { type: "string", label: "Statistik 4 — Angka", default: DEFAULT_STAT4_VALUE },
  stat4Label: { type: "string", label: "Statistik 4 — Label", default: DEFAULT_STAT4_LABEL },
  metaKeywords: {
    type: "string",
    label: "Kata Kunci SEO",
    description: "Dipisahkan koma. Ditambahkan ke <meta name=\"keywords\"> di setiap halaman.",
    default: DEFAULT_META_KEYWORDS,
  },
});
