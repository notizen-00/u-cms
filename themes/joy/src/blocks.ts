import { defineBlock, definePropertySchema } from "@unej-cms/sdk-ui";

/**
 * Blocks this theme contributes to the Page Builder (docs/theme_aware_prd.md
 * §5.2). Only offered while Joy is the active theme, so each declares a
 * `fallback` to a `core.*` block wherever a sensible equivalent exists — that
 * is what keeps a page authored here renderable under another theme.
 */

export const imageHeroBlock = defineBlock({
  id: "joy.image-hero",
  name: "Image Hero",
  description: "Hero dengan gambar besar dan gradien warna khas tema Joy.",
  category: "Hero",
  icon: "image",
  extends: "core.hero",
  fallback: "core.hero",
  propertySchema: definePropertySchema({
    eyebrow: { type: "string", label: "Teks Kecil di Atas Judul" },
    title: { type: "string", label: "Judul Besar", required: true },
    subtitle: { type: "string", label: "Deskripsi" },
    image: { type: "media", label: "Gambar Latar", accept: ["image/*"] },
    ctaLabel: { type: "string", label: "Label Tombol" },
    ctaUrl: { type: "string", label: "Tautan Tombol" },
    align: {
      type: "select",
      label: "Perataan",
      options: [
        { label: "Kiri", value: "left" },
        { label: "Tengah", value: "center" },
      ],
      default: "left",
    },
  }),
});

/**
 * No `fallback`: a mega menu renders a CMS *menu resource*, not content
 * stored in the block (docs/theme_aware_prd.md §20), so there is nothing for
 * a core block to stand in for — the menu itself survives a theme switch
 * regardless, and other themes simply render it as their normal navigation.
 */
export const megaMenuBlock = defineBlock({
  id: "joy.mega-menu",
  name: "Mega Menu",
  description: "Navigasi lebar multi-kolom yang mengambil struktur dari menu CMS.",
  category: "Navigation",
  icon: "layout-grid",
  propertySchema: definePropertySchema({
    menu: {
      type: "string",
      label: "Lokasi Menu",
      description: 'Nama lokasi menu CMS yang ditampilkan, mis. "primary".',
      default: "primary",
    },
    columns: { type: "number", label: "Jumlah Kolom", default: 3, min: 2, max: 4, step: 1 },
  }),
});

export const announcementBlock = defineBlock({
  id: "joy.announcement",
  name: "Pengumuman",
  description: "Pita pengumuman menonjol dengan tautan tindak lanjut.",
  category: "Content",
  icon: "megaphone",
  fallback: "core.text",
  propertySchema: definePropertySchema({
    title: { type: "string", label: "Judul", required: true },
    body: { type: "string", label: "Isi" },
    ctaLabel: { type: "string", label: "Label Tombol" },
    ctaUrl: { type: "string", label: "Tautan Tombol" },
    tone: {
      type: "select",
      label: "Nada Warna",
      options: [
        { label: "Utama", value: "primary" },
        { label: "Info", value: "info" },
        { label: "Peringatan", value: "warning" },
      ],
      default: "primary",
    },
  }),
});

export const blocks = [imageHeroBlock, megaMenuBlock, announcementBlock];

/**
 * Starter homepage for a site using this theme (docs/theme_aware_prd.md §19).
 * Applying Joy materialises these as the site's real beranda, so what an
 * editor lands on already looks like Joy — and every part of it is editable,
 * unlike the theme's hardcoded `home` layout.
 *
 * Only types listed in `blockRenderers` appear here; anything else would be
 * skipped at render time and read as a missing section.
 */
export const defaultHomepage = [
  {
    type: "joy.image-hero",
    props: {
      eyebrow: "Selamat datang",
      title: "",
      subtitle: "Tulis kalimat pembuka yang menjelaskan situs Anda di sini.",
      align: "left",
    },
  },
  {
    type: "core.news",
    props: { title: "Berita Terbaru", limit: 6, category: "" },
  },
  {
    type: "joy.announcement",
    props: {
      title: "Siap bergabung?",
      body: "Tambahkan ajakan bertindak dan tautan kontak di sini.",
      tone: "primary",
    },
  },
];
