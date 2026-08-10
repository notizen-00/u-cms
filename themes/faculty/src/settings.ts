import { definePropertySchema, type PropertySchema } from "@unej-cms/sdk-ui";

// #0d9488 (teal-500) measured ~3.7:1 against white/light backgrounds and
// against white button text — both below WCAG AA's 4.5:1 for normal text.
// teal-800 keeps the same hue but is dark enough to clear 4.5:1 in every
// place the theme uses --primary as text-on-light or as a solid button fill
// with white text (see .pill/.eyebrow/.section-head/.read-more/.info-icon in
// sections.css, .cms-button in article.css).
export const DEFAULT_PRIMARY_COLOR = "#115e59";
export const DEFAULT_SECONDARY_COLOR = "#facc15";
export const DEFAULT_HERO_EYEBROW = "Selamat Datang di Situs Resmi Kami";
export const DEFAULT_HERO_HEADLINE = "Mencetak Lulusan Profesional, Berintegritas & Berdaya Saing Global";
export const DEFAULT_HERO_DESCRIPTION =
  "Menghadirkan pendidikan berkualitas, didukung riset inovatif dan pengabdian masyarakat untuk menghasilkan lulusan unggul dan berdaya saing internasional.";
export const DEFAULT_HERO_CTA_LABEL = "Jelajahi Program Kami";
export const DEFAULT_META_KEYWORDS = "fakultas, program studi, pendidikan tinggi, kampus";

/**
 * Configurable per-site options (admin-editable via the Dashboard's theme
 * settings panel). `heroVideoUrl` is the theme's signature feature — an
 * autoplaying, muted, looping background video behind the homepage hero
 * (see Home.svelte), with `heroVideoPoster` as the fallback image shown
 * before the video loads / when video can't play. `accreditationLogos` is
 * a free-form array (edited as JSON in the dashboard, same as any `array`
 * PropertySchema field) so a site can list as many badges as it has.
 */
export const settings: PropertySchema = definePropertySchema({
  primaryColor: {
    type: "color",
    label: "Warna Utama",
    description: "Warna identitas utama — tombol, tautan aktif, aksen eyebrow hero.",
    default: DEFAULT_PRIMARY_COLOR,
  },
  secondaryColor: {
    type: "color",
    label: "Warna Sekunder",
    description: "Warna aksen kedua — badge dan sorotan.",
    default: DEFAULT_SECONDARY_COLOR,
  },
  heroEyebrow: {
    type: "string",
    label: "Teks Kecil di Atas Judul Hero",
    description: "Contoh: \"Membangun Senyum Sehat Bersama FKG UNEJ\".",
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
  heroVideoUrl: {
    type: "media",
    label: "Video Latar Hero",
    description: "Video MP4 yang diputar otomatis (bisu, berulang) sebagai latar hero beranda.",
    accept: ["video/mp4", "video/webm"],
    default: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4",
  },
  heroVideoPoster: {
    type: "media",
    label: "Gambar Poster Video",
    description: "Ditampilkan sebelum video dimuat, dan sebagai cadangan jika video gagal diputar.",
    accept: ["image/*"],
  },
  accreditationLogos: {
    type: "array",
    label: "Logo Akreditasi / Mitra",
    description: "Strip logo di pojok kiri atas header, mis. logo universitas, akreditasi, ISO.",
    items: definePropertySchema({
      url: { type: "media", label: "Gambar Logo" },
      label: { type: "string", label: "Nama (untuk alt text)", required: true },
    }),
    default: [
    {
      url: "https://untidar.ac.id/wp-content/uploads/2024/05/Logo-BLU-Speed-218x218.png",
      label: "Universitas Jember",
    },
    {
      url: "https://icon2.cleanpng.com/20180713/ujz/kisspng-university-of-jember-sebelas-maret-university-univ-university-5b4949e02ac7b0.7918986215315296961752.jpg",
      label: "Fakultas Kesehatan Masyarakat Universitas Jember",
    },
  ],
  },
  showLanguageSwitcher: {
    type: "boolean",
    label: "Tampilkan Pilihan Bahasa",
    description: "Elemen visual saja — situs belum mendukung multi-bahasa sungguhan.",
    default: true,
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
