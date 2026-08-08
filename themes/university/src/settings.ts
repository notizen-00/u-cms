import { definePropertySchema, type PropertySchema } from "@unej-cms/sdk-ui";

export const DEFAULT_PRIMARY_COLOR = "#0f4c81";
export const DEFAULT_SECONDARY_COLOR = "#f2a900";
export const DEFAULT_HERO_TAGLINE =
  "Membentuk generasi unggul melalui pendidikan berkualitas, riset inovatif, dan pengabdian masyarakat.";
export const DEFAULT_ACCREDITATION_TEXT = "Terakreditasi Unggul BAN-PT";
export const DEFAULT_STAT_STUDENTS = "15.000+";
export const DEFAULT_STAT_PROGRAMS = "45";
export const DEFAULT_STAT_FACULTY = "600+";
export const DEFAULT_STAT_ALUMNI = "50.000+";
export const DEFAULT_META_KEYWORDS = "universitas, pendidikan tinggi, perguruan tinggi, kampus";

/**
 * Configurable per-site options (admin-editable via the Dashboard's theme
 * settings panel — see apps/dashboard's `sites/[siteId]/theme/settings`).
 * The stat counters are settings rather than hardcoded copy so every
 * institution using this theme shows its own real numbers on the hero.
 */
export const settings: PropertySchema = definePropertySchema({
  primaryColor: {
    type: "color",
    label: "Warna Utama",
    description: "Warna identitas utama institusi — tombol, tautan aktif, aksen.",
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
    description: "Kalimat pengantar di bawah nama institusi pada bagian hero beranda.",
    default: DEFAULT_HERO_TAGLINE,
  },
  heroImage: {
    type: "media",
    label: "Gambar Latar Hero",
    description: "Gambar latar pada bagian hero beranda (opsional).",
  },
  accreditationText: {
    type: "string",
    label: "Teks Akreditasi",
    description: "Ditampilkan sebagai badge di hero, mis. \"Terakreditasi Unggul BAN-PT\".",
    default: DEFAULT_ACCREDITATION_TEXT,
  },
  statStudents: {
    type: "string",
    label: "Jumlah Mahasiswa",
    default: DEFAULT_STAT_STUDENTS,
  },
  statPrograms: {
    type: "string",
    label: "Jumlah Program Studi",
    default: DEFAULT_STAT_PROGRAMS,
  },
  statFaculty: {
    type: "string",
    label: "Jumlah Dosen & Tenaga Pendidik",
    default: DEFAULT_STAT_FACULTY,
  },
  statAlumni: {
    type: "string",
    label: "Jumlah Alumni",
    default: DEFAULT_STAT_ALUMNI,
  },
  metaKeywords: {
    type: "string",
    label: "Kata Kunci SEO",
    description: "Dipisahkan koma. Ditambahkan ke <meta name=\"keywords\"> di setiap halaman.",
    default: DEFAULT_META_KEYWORDS,
  },
});
