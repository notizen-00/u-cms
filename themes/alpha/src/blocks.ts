import { defineBlock, definePropertySchema } from "@unej-cms/sdk-ui";
import {
  DEFAULT_HERO_CTA_LABEL,
  DEFAULT_HERO_DESCRIPTION,
  DEFAULT_HERO_EYEBROW,
  DEFAULT_HERO_HEADLINE,
  DEFAULT_STAT_ITEMS,
} from "./settings.js";

/**
 * Blocks this theme contributes to the Page Builder (docs/theme_aware_prd.md
 * §5.2). They are only offered while Alpha is the active theme, so each
 * declares a `fallback` to a `core.*` block — that is what keeps a page
 * authored here renderable after a switch to another theme, instead of the
 * section silently disappearing.
 *
 * Every non-media field below also carries a real `default` (the same battle
 * royale copy `defaultHomepage` seeds a new site's homepage with) rather than
 * an empty string/array — the Dashboard's block picker seeds a new block's
 * `props` straight from these schema defaults (`defaultPropsFor` in
 * apps/dashboard's block-mutations.ts), so dropping "Battle Hero" etc. onto
 * any page already looks finished instead of blank, ready to reskin instead
 * of ready to fill in. Media fields (`video`/`image`) are the one exception —
 * there's no real uploaded file to default them to.
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
    eyebrow: { type: "string", label: "Teks Kecil di Atas Judul", default: DEFAULT_HERO_EYEBROW },
    title: { type: "string", label: "Judul Besar", required: true, default: DEFAULT_HERO_HEADLINE },
    subtitle: { type: "string", label: "Deskripsi", default: DEFAULT_HERO_DESCRIPTION },
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
    ctaLabel: { type: "string", label: "Label Tombol", default: DEFAULT_HERO_CTA_LABEL },
    ctaUrl: { type: "string", label: "Tautan Tombol", default: "/news/" },
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
      default: DEFAULT_STAT_ITEMS,
    },
  }),
});

const DEFAULT_MODE_GRID_ITEMS = [
  { title: "Battle Royale", description: "Mode klasik 100 pemain, bertahan hidup hingga akhir." },
  { title: "Arena", description: "Pertarungan tim cepat dengan respawn tanpa akhir." },
  { title: "Peringkat", description: "Naik peringkat musiman dan buktikan skill terbaikmu." },
];

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
      default: DEFAULT_MODE_GRID_ITEMS,
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
      eyebrow: DEFAULT_HERO_EYEBROW,
      title: "",
      subtitle: DEFAULT_HERO_DESCRIPTION,
      ctaLabel: DEFAULT_HERO_CTA_LABEL,
      ctaUrl: "/news/",
    },
  },
  {
    type: "alpha.stats-strip",
    props: {
      items: DEFAULT_STAT_ITEMS,
    },
  },
  {
    type: "alpha.mode-grid",
    props: {
      title: "Mode Permainan",
      items: DEFAULT_MODE_GRID_ITEMS,
    },
  },
  {
    type: "core.news",
    props: { title: "Berita & Pembaruan", limit: 6, category: "" },
  },
];
