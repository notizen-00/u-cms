import { definePropertySchema, type PropertySchema } from "@unej-cms/sdk-ui";

export const DEFAULT_PRIMARY_COLOR = "#f2a900";
export const DEFAULT_SECONDARY_COLOR = "#e1261c";
export const DEFAULT_HERO_EYEBROW = "SEASON 1 SEKARANG AKTIF";
export const DEFAULT_HERO_HEADLINE = "MASUKI MEDAN PERTEMPURAN";
export const DEFAULT_HERO_DESCRIPTION =
  "Bertahan hidup, bertaktik, dan jadilah yang terakhir berdiri. Bergabunglah dengan jutaan pemain lain di arena kompetitif kami.";
export const DEFAULT_HERO_CTA_LABEL = "Mulai Sekarang";
export const DEFAULT_META_KEYWORDS = "game, esports, komunitas, turnamen, battle royale";

/**
 * Configurable per-site options (admin-editable via the Dashboard's theme
 * settings panel). `heroBackgroundVideo`/`heroBackgroundImage` are this
 * theme's signature feature — a full-screen cinematic hero, video preferred
 * with the image as poster/fallback (see BattleHero.svelte). `statItems` is
 * the big-numbers strip (e.g. "500JT+ / PEMAIN TERDAFTAR") every battle
 * royale portal opens with — a free-form array so a site can show as many or
 * as few as it wants.
 */
export const settings: PropertySchema = definePropertySchema({
  primaryColor: {
    type: "color",
    label: "Warna Utama",
    description: "Warna identitas utama — tombol, aksen eyebrow, sorotan angka statistik.",
    default: DEFAULT_PRIMARY_COLOR,
  },
  secondaryColor: {
    type: "color",
    label: "Warna Sekunder",
    description: "Warna aksen kedua — badge, tag mode permainan.",
    default: DEFAULT_SECONDARY_COLOR,
  },
  heroEyebrow: {
    type: "string",
    label: "Teks Kecil di Atas Judul Hero",
    default: DEFAULT_HERO_EYEBROW,
  },
  heroHeadline: {
    type: "string",
    label: "Judul Besar Hero",
    default: DEFAULT_HERO_HEADLINE,
  },
  heroDescription: {
    type: "string",
    label: "Deskripsi Hero",
    default: DEFAULT_HERO_DESCRIPTION,
  },
  heroCtaLabel: {
    type: "string",
    label: "Label Tombol CTA Hero",
    default: DEFAULT_HERO_CTA_LABEL,
  },
  heroCtaUrl: {
    type: "string",
    label: "Tautan Tombol CTA Hero",
    default: "/news/",
  },
  heroBackgroundVideo: {
    type: "media",
    label: "Video Latar Hero",
    description: "Video MP4 yang diputar otomatis (bisu, berulang) sebagai latar hero beranda. Kosongkan untuk memakai gambar saja.",
    accept: ["video/mp4", "video/webm"],
  },
  heroBackgroundImage: {
    type: "media",
    label: "Gambar Latar Hero",
    description: "Ditampilkan sebelum video dimuat, dan sebagai cadangan jika video gagal diputar / tidak diisi.",
    accept: ["image/*"],
  },
  statItems: {
    type: "array",
    label: "Pita Statistik",
    description: "Angka besar di bawah hero, mis. jumlah pemain terdaftar atau turnamen berjalan.",
    items: definePropertySchema({
      value: { type: "string", label: "Angka", required: true, placeholder: "500JT+" },
      label: { type: "string", label: "Label", required: true, placeholder: "PEMAIN TERDAFTAR" },
    }),
    default: [
      { value: "500JT+", label: "PEMAIN TERDAFTAR" },
      { value: "30JT+", label: "PEMAIN AKTIF HARIAN" },
      { value: "200+", label: "TURNAMEN DIGELAR" },
      { value: "24/7", label: "SERVER AKTIF" },
    ],
  },
  showSearch: {
    type: "boolean",
    label: "Tampilkan Ikon Pencarian",
    default: true,
  },
  metaKeywords: {
    type: "string",
    label: "Kata Kunci SEO",
    description: "Dipisahkan koma. Ditambahkan ke <meta name=\"keywords\"> di setiap halaman.",
    default: DEFAULT_META_KEYWORDS,
  },
});
