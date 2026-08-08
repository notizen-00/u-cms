import { definePropertySchema, type PropertySchema } from "@unej-cms/sdk-ui";

export const DEFAULT_PRIMARY_COLOR = "#075985";
export const DEFAULT_META_KEYWORDS = "berita kampus, informasi resmi, pengumuman";

/**
 * Configurable theme options. `default` values are what the renderer uses
 * today (no per-site settings store exists yet — see AtomicDeployService/
 * BuildProcessor in apps/backend) — a future settings UI would just need to
 * pass overrides through to the renderer alongside these schema-declared
 * defaults.
 */
export const settings: PropertySchema = definePropertySchema({
  primaryColor: {
    type: "color",
    label: "Warna Utama",
    description: "Dipakai untuk tombol dan aksen di seluruh situs.",
    default: DEFAULT_PRIMARY_COLOR,
  },
  metaKeywords: {
    type: "string",
    label: "Kata Kunci SEO",
    description: "Dipisahkan koma. Ditambahkan ke <meta name=\"keywords\"> di setiap halaman.",
    default: DEFAULT_META_KEYWORDS,
  },
});
