# Menambah Blok pada Tema — Panduan Penulis Tema

Panduan implementasi untuk [`theme_aware_prd.md`](./theme_aware_prd.md). Intinya
satu: **menambah blok baru tidak pernah menyentuh kode Page Builder.** Tema
mendeklarasikan blok, CMS membaca deklarasi itu.

## Pembagian tanggung jawab

| Menyimpan apa | Di mana |
| --- | --- |
| Isi halaman (`blocks` JSON) | kolom `pages.blocks` — lihat `@unej-cms/sdk-content` |
| Blok apa saja yang tersedia | Block Registry (`core.*` + blok tema + blok plugin) |
| Bagaimana blok digambar | `CmsTheme.blockRenderers` milik tema |

Konten tidak pernah menyimpan HTML. Itulah sebabnya satu halaman bisa dirender
oleh lebih dari satu tema, dan kenapa ganti tema tidak menghilangkan isi.

## 1. Deklarasikan bloknya

`src/blocks.ts` pada paket tema:

```ts
import { defineBlock, definePropertySchema } from "@unej-cms/sdk-ui";

export const videoHeroBlock = defineBlock({
  id: "faculty.video-hero",     // WAJIB bernamespace; `core.` dilarang
  name: "Video Hero",
  category: "Hero",             // jadi grup di block picker
  extends: "core.hero",         // opsional: blok inti yang di-superset
  fallback: "core.hero",        // dipakai saat tema lain aktif
  propertySchema: definePropertySchema({
    title: { type: "string", label: "Judul", required: true },
    video: { type: "media", label: "Video Latar", accept: ["video/mp4"] },
  }),
});

export const blocks = [videoHeroBlock];
```

`propertySchema` inilah yang menghasilkan form editor. Builder tidak pernah
tahu komponen Svelte Anda — ia hanya membaca schema. Jadi tipe field yang
didukung (`string`, `number`, `boolean`, `select`, `color`, `media`,
`richtext`, `array`, `object`) menentukan apa yang bisa disunting.

**Selalu isi `fallback`** ke blok `core.*` bila ada padanannya. Tanpa itu,
halaman yang memakai blok ini akan kehilangan bagian tersebut begitu situs
berpindah ke tema lain.

## 2. Buat komponen rendernya

`src/blocks/VideoHero.svelte`:

```svelte
<script>
  let { props, site, theme, news, pages, menus } = $props();
</script>

<section class="hero">
  <h1 class="hero-title">{props.title || site.name}</h1>
</section>
```

Setiap komponen blok menerima `props` (isi blok) plus data ambient yang sama
dengan layout. Pakai class dan token milik tema Anda sendiri — itu yang membuat
blok terlihat menyatu, bukan seperti blok generik yang ditempel.

Blok dinamis (mis. daftar berita) harus membaca `news`/`pages`, **bukan**
menyalin isinya ke `props` — kalau disalin, isinya membeku di waktu penyuntingan
dan tidak pernah ikut ter-update.

## 3. Petakan tipe blok ke komponennya

Di `src/layouts.ts` (komponen `.svelte` diubah jadi string oleh
`scripts/generate-svelte-sources.mjs`, yang memindai `src/layouts/` dan
`src/blocks/`):

```ts
import { BlockVideoHeroSource } from "./svelte-sources.generated.js";

export const blockRenderers: Record<string, string> = {
  "core.hero": BlockVideoHeroSource,        // tema WAJIB merender core.*
  "faculty.video-hero": BlockVideoHeroSource,
};
```

Memetakan blok inti dan blok tema ke komponen yang sama membuat konversi
`faculty.video-hero → core.hero` tidak terlihat berubah bagi pembaca.

Blok tanpa entri di sini **dilewati** saat render, bukan digambar setengah jadi.

## 4. Sambungkan ke tema

```ts
export const facultyTheme = defineTheme<string>({
  manifest, layouts, settings, tokens,
  blocks,          // dari langkah 1
  blockRenderers,  // dari langkah 3
});
```

Selesai. Jalankan `pnpm --filter @unej-cms/theme-<nama> run build`, dan blok
baru langsung muncul di block picker saat tema itu aktif.

## Yang perlu diketahui sebelum mulai

- **Id blok itu permanen.** Ia tersimpan di dalam konten halaman; menggantinya
  membuat setiap halaman yang memakainya jadi yatim.
- **Hanya tema Svelte** yang mendukung blok. Tema Eta (`default`, `premium`)
  belum punya `blockRenderers`, sehingga halaman berbasis blok akan kosong di
  sana.
- **Pratinjau memakai renderer produksi** (`SvelteCompilerService` yang sama),
  jadi yang tampil di builder adalah yang akan di-build — tetapi pratinjau
  merender isi yang **sudah tersimpan**, bukan ketikan terakhir.
