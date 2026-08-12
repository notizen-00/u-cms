import { defineBlock, definePropertySchema, type BlockDefinition } from '@unej-cms/sdk-ui';

/**
 * The CMS's own block catalog — the `core.*` blocks guaranteed to exist no
 * matter which theme is active (docs/theme_aware_prd.md §5.1).
 *
 * These are declared as *metadata only* (no `render`): what a core block
 * looks like is the active theme's business, so each theme renders them with
 * its own markup. That split is the whole point of the theme-aware builder —
 * a page authored here stays renderable after a theme switch precisely
 * because nothing about its presentation is baked into the stored content.
 *
 * Ids are permanent: stored page content references blocks by id, so
 * renaming one silently orphans every page already using it.
 */

const BASIC = 'Basic';
const MEDIA = 'Media';
const HERO = 'Hero';
const LAYOUT = 'Layout';
const CONTENT = 'Content';

const ALIGN_OPTIONS = [
  { label: 'Kiri', value: 'left' },
  { label: 'Tengah', value: 'center' },
] as const;

export const coreText = defineBlock({
  id: 'core.text',
  name: 'Teks',
  description: 'Paragraf teks kaya (tebal, miring, tautan, daftar).',
  category: BASIC,
  icon: 'pilcrow',
  propertySchema: definePropertySchema({
    content: { type: 'richtext', label: 'Isi', default: '' },
  }),
});

export const coreImage = defineBlock({
  id: 'core.image',
  name: 'Gambar',
  category: MEDIA,
  icon: 'image',
  propertySchema: definePropertySchema({
    src: { type: 'media', label: 'Gambar', accept: ['image/*'], required: true },
    alt: { type: 'string', label: 'Teks Alternatif', description: 'Deskripsi singkat untuk pembaca layar.' },
    caption: { type: 'string', label: 'Keterangan' },
  }),
});

export const coreVideo = defineBlock({
  id: 'core.video',
  name: 'Video',
  category: MEDIA,
  icon: 'video',
  propertySchema: definePropertySchema({
    src: { type: 'media', label: 'Video', accept: ['video/mp4', 'video/webm'], required: true },
    poster: { type: 'media', label: 'Gambar Poster', accept: ['image/*'] },
    autoplay: { type: 'boolean', label: 'Putar Otomatis', default: false },
    loop: { type: 'boolean', label: 'Ulangi', default: false },
    muted: { type: 'boolean', label: 'Bisukan', default: true },
  }),
});

export const coreHero = defineBlock({
  id: 'core.hero',
  name: 'Hero',
  description: 'Bagian pembuka halaman: judul besar, deskripsi, dan tombol ajakan.',
  category: HERO,
  icon: 'sparkles',
  propertySchema: definePropertySchema({
    title: { type: 'string', label: 'Judul', required: true },
    subtitle: { type: 'string', label: 'Sub Judul' },
    eyebrow: { type: 'string', label: 'Teks Kecil di Atas Judul' },
    image: { type: 'media', label: 'Gambar Latar', accept: ['image/*'] },
    ctaLabel: { type: 'string', label: 'Label Tombol' },
    ctaUrl: { type: 'string', label: 'Tautan Tombol' },
    align: { type: 'select', label: 'Perataan', options: ALIGN_OPTIONS, default: 'left' },
  }),
});

export const coreButton = defineBlock({
  id: 'core.button',
  name: 'Tombol',
  category: BASIC,
  icon: 'mouse-pointer-click',
  propertySchema: definePropertySchema({
    label: { type: 'string', label: 'Label', required: true },
    url: { type: 'string', label: 'Tautan', required: true },
    variant: {
      type: 'select',
      label: 'Gaya',
      options: [
        { label: 'Utama', value: 'primary' },
        { label: 'Garis', value: 'outline' },
      ],
      default: 'primary',
    },
  }),
});

export const coreColumns = defineBlock({
  id: 'core.columns',
  name: 'Kolom',
  description: 'Membagi konten menjadi beberapa kolom sejajar.',
  category: LAYOUT,
  icon: 'columns-2',
  propertySchema: definePropertySchema({
    count: { type: 'number', label: 'Jumlah Kolom', default: 2, min: 2, max: 4, step: 1 },
  }),
  // Nested content lives in slots rather than props, so each column can hold
  // arbitrary blocks instead of a fixed field shape.
  slots: ['column-1', 'column-2', 'column-3', 'column-4'],
});

export const coreSearch = defineBlock({
  id: 'core.search',
  name: 'Pencarian',
  description: 'Kotak pencarian isi situs.',
  category: CONTENT,
  icon: 'search',
  propertySchema: definePropertySchema({
    placeholder: { type: 'string', label: 'Teks Placeholder', default: 'Cari informasi...' },
    action: { type: 'string', label: 'Tujuan Pencarian', default: '/news/' },
  }),
});

export const coreNews = defineBlock({
  id: 'core.news',
  name: 'Berita',
  description: 'Menampilkan berita terbaru secara otomatis dari menu Berita.',
  category: CONTENT,
  icon: 'newspaper',
  propertySchema: definePropertySchema({
    title: { type: 'string', label: 'Judul Bagian', default: 'Berita Terbaru' },
    limit: { type: 'number', label: 'Jumlah Berita', default: 6, min: 1, max: 24, step: 1 },
    category: { type: 'string', label: 'Batasi ke Kategori', description: 'Kosongkan untuk semua kategori.' },
  }),
});

export const coreEvents = defineBlock({
  id: 'core.events',
  name: 'Agenda',
  description: 'Menampilkan agenda/kegiatan mendatang.',
  category: CONTENT,
  icon: 'calendar',
  propertySchema: definePropertySchema({
    title: { type: 'string', label: 'Judul Bagian', default: 'Agenda' },
    limit: { type: 'number', label: 'Jumlah Agenda', default: 4, min: 1, max: 24, step: 1 },
  }),
});

export const coreGallery = defineBlock({
  id: 'core.gallery',
  name: 'Galeri',
  category: MEDIA,
  icon: 'images',
  propertySchema: definePropertySchema({
    title: { type: 'string', label: 'Judul Bagian' },
    columns: { type: 'number', label: 'Jumlah Kolom', default: 3, min: 2, max: 4, step: 1 },
    images: {
      type: 'array',
      label: 'Gambar',
      items: definePropertySchema({
        url: { type: 'media', label: 'Gambar', accept: ['image/*'], required: true },
        alt: { type: 'string', label: 'Teks Alternatif' },
        caption: { type: 'string', label: 'Keterangan' },
      }),
    },
  }),
});

export const CORE_BLOCKS: readonly BlockDefinition[] = [
  coreText,
  coreImage,
  coreVideo,
  coreHero,
  coreButton,
  coreColumns,
  coreSearch,
  coreNews,
  coreEvents,
  coreGallery,
];
