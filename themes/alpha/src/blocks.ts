import { defineBlock, definePropertySchema } from "@unej-cms/sdk-ui";

/**
 * Blocks this theme contributes to the Page Builder (docs/theme_aware_prd.md
 * §5.2). They are only offered while Alpha is the active theme, so each
 * declares a `fallback` to a `core.*` block — that is what keeps a page
 * authored here renderable after a switch to another theme, instead of the
 * section silently disappearing.
 */

export const battleHeroBlock = defineBlock({
  id: "alpha.battle-hero",
  name: "Battle Hero",
  description: "Hero layar penuh dengan latar video/gambar sinematik dan tombol aksi bersudut tajam — ciri khas tema Alpha.",
  category: "Hero",
  icon: "swords",
  extends: "core.hero",
  fallback: "core.hero",
  propertySchema: definePropertySchema({
    eyebrow: { type: "string", label: "Teks Kecil di Atas Judul" },
    title: { type: "string", label: "Judul Besar", required: true },
    subtitle: { type: "string", label: "Deskripsi" },
    video: {
      type: "media",
      label: "Video Latar",
      description: "MP4/WebM, diputar otomatis tanpa suara dan berulang.",
      accept: ["video/mp4", "video/webm"],
    },
    image: {
      type: "media",
      label: "Gambar Latar",
      description: "Tampil sebelum video dimuat, dan sebagai cadangan jika video gagal diputar / tidak diisi.",
      accept: ["image/*"],
    },
    ctaLabel: { type: "string", label: "Label Tombol" },
    ctaUrl: { type: "string", label: "Tautan Tombol" },
  }),
});

export const statsStripBlock = defineBlock({
  id: "alpha.stats-strip",
  name: "Pita Statistik",
  description: "Baris angka besar (jumlah pemain, turnamen, dsb.) tepat di bawah hero.",
  category: "Content",
  icon: "bar-chart-3",
  fallback: "core.text",
  propertySchema: definePropertySchema({
    items: {
      type: "array",
      label: "Item Statistik",
      items: definePropertySchema({
        value: { type: "string", label: "Angka", required: true, placeholder: "500JT+" },
        label: { type: "string", label: "Label", required: true, placeholder: "PEMAIN TERDAFTAR" },
      }),
    },
  }),
});

export const modeGridBlock = defineBlock({
  id: "alpha.mode-grid",
  name: "Grid Mode Permainan",
  description: "Kartu grid bersudut terpotong untuk menampilkan mode permainan, fitur, atau musim kompetitif.",
  category: "Layout",
  icon: "layout-grid",
  fallback: "core.gallery",
  propertySchema: definePropertySchema({
    title: { type: "string", label: "Judul Bagian", default: "Mode Permainan" },
    items: {
      type: "array",
      label: "Kartu",
      items: definePropertySchema({
        title: { type: "string", label: "Judul", required: true },
        description: { type: "string", label: "Deskripsi" },
        image: { type: "media", label: "Gambar", accept: ["image/*"] },
        url: { type: "string", label: "Tautan" },
      }),
    },
  }),
});

export const blocks = [battleHeroBlock, statsStripBlock, modeGridBlock];

/**
 * Starter homepage for a site using this theme (docs/theme_aware_prd.md §19).
 * Mirrors what this theme's hardcoded `home` layout draws — battle hero,
 * stats strip, mode grid, then news — except every part of it is editable in
 * the builder.
 *
 * Only types listed in `blockRenderers` appear here; anything else would be
 * skipped at render time and read as a missing section.
 */
export const defaultHomepage = [
  {
    type: "alpha.battle-hero",
    props: {
      eyebrow: "SEASON 1 SEKARANG AKTIF",
      title: "",
      subtitle:
        "Bertahan hidup, bertaktik, dan jadilah yang terakhir berdiri. Bergabunglah dengan jutaan pemain lain di arena kompetitif kami.",
      ctaLabel: "Mulai Sekarang",
      ctaUrl: "/news/",
    },
  },
  {
    type: "alpha.stats-strip",
    props: {
      items: [
        { value: "500JT+", label: "PEMAIN TERDAFTAR" },
        { value: "30JT+", label: "PEMAIN AKTIF HARIAN" },
        { value: "200+", label: "TURNAMEN DIGELAR" },
        { value: "24/7", label: "SERVER AKTIF" },
      ],
    },
  },
  {
    type: "core.news",
    props: { title: "Berita & Pembaruan", limit: 6, category: "" },
  },
];
