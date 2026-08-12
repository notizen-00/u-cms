import { defineBlock, definePropertySchema } from "@unej-cms/sdk-ui";

/**
 * Blocks this theme contributes to the Page Builder (docs/theme_aware_prd.md
 * §5.2). They are only offered while Faculty is the active theme, so each
 * declares a `fallback` to a `core.*` block — that is what keeps a page
 * authored here renderable after a switch to another theme, instead of the
 * section silently disappearing.
 */

export const videoHeroBlock = defineBlock({
  id: "faculty.video-hero",
  name: "Video Hero",
  description:
    "Hero layar penuh dengan video latar yang diputar otomatis — ciri khas tema Faculty.",
  category: "Hero",
  icon: "video",
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
    poster: {
      type: "media",
      label: "Gambar Poster",
      description: "Tampil sebelum video dimuat, dan sebagai cadangan jika video gagal diputar.",
      accept: ["image/*"],
    },
    overlay: {
      type: "boolean",
      label: "Lapisan Gelap",
      description: "Menjaga teks tetap terbaca di atas video.",
      default: true,
    },
    ctaLabel: { type: "string", label: "Label Tombol" },
    ctaUrl: { type: "string", label: "Tautan Tombol" },
  }),
});

export const academicSearchBlock = defineBlock({
  id: "faculty.academic-search",
  name: "Pencarian Akademik",
  description: "Kotak pencarian dengan filter program studi dan jenis dokumen.",
  category: "Content",
  icon: "search",
  extends: "core.search",
  fallback: "core.search",
  propertySchema: definePropertySchema({
    placeholder: { type: "string", label: "Teks Placeholder", default: "Cari informasi akademik..." },
    showProgramFilter: { type: "boolean", label: "Tampilkan Filter Program Studi", default: true },
    action: { type: "string", label: "Tujuan Pencarian", default: "/news/" },
  }),
});

export const facultyProfileBlock = defineBlock({
  id: "faculty.faculty-profile",
  name: "Profil Dosen",
  description: "Kartu profil dosen/tenaga pendidik dengan foto dan bidang keahlian.",
  category: "Content",
  icon: "users",
  fallback: "core.text",
  propertySchema: definePropertySchema({
    title: { type: "string", label: "Judul Bagian", default: "Profil Dosen" },
    people: {
      type: "array",
      label: "Daftar Dosen",
      items: definePropertySchema({
        name: { type: "string", label: "Nama", required: true },
        role: { type: "string", label: "Jabatan / Bidang Keahlian" },
        photo: { type: "media", label: "Foto", accept: ["image/*"] },
        url: { type: "string", label: "Tautan Profil" },
      }),
    },
  }),
});

export const blocks = [videoHeroBlock, academicSearchBlock, facultyProfileBlock];

/**
 * Starter homepage for a site using this theme (docs/theme_aware_prd.md §19).
 * Mirrors what this theme's hardcoded `home` layout draws — video hero, then
 * search, then news — except every part of it is editable in the builder.
 *
 * Only types listed in `blockRenderers` appear here; anything else would be
 * skipped at render time and read as a missing section.
 */
export const defaultHomepage = [
  {
    type: "faculty.video-hero",
    props: {
      eyebrow: "Selamat Datang di Situs Resmi Kami",
      title: "",
      subtitle:
        "Menghadirkan pendidikan berkualitas, didukung riset inovatif dan pengabdian masyarakat.",
      overlay: true,
      ctaLabel: "Jelajahi Program Kami",
      ctaUrl: "#info",
    },
  },
  {
    type: "faculty.academic-search",
    props: {
      placeholder: "Cari informasi akademik...",
      showProgramFilter: true,
      action: "/news/",
    },
  },
  {
    type: "core.news",
    props: { title: "Berita & Pengumuman", limit: 6, category: "" },
  },
];
