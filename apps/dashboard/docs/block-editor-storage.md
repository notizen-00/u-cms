# Penyimpanan Konten Block Editor — Kontrak Backend

Status: **Opsi B sudah diterapkan** di backend (lihat §9) — ditulis setelah block editor (Gutenberg-style) diimplementasikan di admin app SvelteKit.
Companion ke `PRD.md` (admin app) dan `docs/media_guide.md` (Media Library).

Dokumen ini menjawab satu pertanyaan: **konten dari block editor disimpan bagaimana di backend, dan apa yang perlu diubah supaya benar-benar tampil di situs publik.**

---

# 1. Ringkasan Eksekutif

Block editor **tidak butuh perubahan schema untuk menyimpan** — semuanya tetap masuk ke kolom `body_markdown` yang sudah ada, sebagai string. Tidak ada migrasi DB yang diblokir.

**Tapi ada masalah nyata di sisi render.** Renderer situs publik (`EtaSiteRenderer`) dikonfigurasi `MarkdownIt({ html: false })`, yang meng-**escape** semua HTML mentah. Akibatnya 5 dari 13 tipe blok tidak hanya gagal tampil — penanda internalnya **muncul sebagai teks mentah** di halaman publik.

| | |
| --- | --- |
| Simpan ke DB | ✅ Jalan apa adanya, tanpa perubahan |
| Round-trip di editor admin | ✅ Jalan (sanitasi hanya saat build, bukan saat simpan) |
| Tampil di situs publik | ❌ Rusak untuk blok Tombol, Embed, Kalender, Kolom, HTML |

Rekomendasi: **Opsi B di §6** — ubah konfigurasi renderer + perluas allowlist sanitizer. Perubahan terbatas di satu file backend, tidak perlu migrasi.

---

# 2. Kondisi Backend Saat Ini (terverifikasi dari kode)

Diverifikasi langsung di repo `unej-cms`, bukan dari PRD:

### Kolom penyimpanan

`src/database/schema/news.schema.ts:27` dan `pages.schema.ts` yang setara:

```ts
bodyMarkdown: text('body_markdown').notNull().default(''),
```

Kolom `text` biasa. **Tidak ada kolom block JSON.** Tidak ada batas panjang.

### Kapan sanitasi terjadi

Ini penting dan sering disalahpahami: **konten TIDAK disanitasi saat disimpan.** Pencarian `sanitize|markdown-it` di seluruh `src/` hanya menemukan satu pemakai: `src/modules/builder/render/eta-site-renderer.ts`.

Artinya:

- `POST`/`PATCH` news/pages menyimpan string **verbatim** ke DB.
- Sanitasi hanya berjalan saat **build situs statis**.

Konsekuensinya bagus untuk kita: penanda blok yang ditulis editor tetap utuh di DB, jadi tombol Edit di admin bisa mem-parse ulang blok dengan benar. Yang rusak murni output publiknya.

### Pipeline render

`eta-site-renderer.ts:56` dan `:92-102`:

```ts
this.md = new MarkdownIt({ html: false, linkify: true, breaks: true });

private renderMarkdown(markdown: string): string {
  const html = this.md.render(markdown ?? '');
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}
```

`ALLOWED_TAGS` (`:13-43`) berisi: `p, br, strong, em, b, i, u, a, ul, ol, li, h1–h6, blockquote, code, pre, table, thead, tbody, tr, th, td, img, hr, span`.

Dua gerbang yang harus dilewati konten:

1. **`html: false`** — HTML mentah di markdown di-escape jadi teks terlihat, bukan di-render.
2. **`sanitizeHtml`** — tag di luar `ALLOWED_TAGS` dibuang; **atribut `class` tidak diizinkan di tag manapun**; `div`, `iframe`, `caption`, `figure` tidak ada di allowlist.

---

# 3. Format yang Dikirim Admin App

Block editor menyerialkan blok ke markdown (`src/lib/editor/blocks.ts`). Dua strategi:

**a. Blok yang punya padanan markdown** ditulis sebagai markdown biasa — portabel, tidak butuh dukungan khusus.

**b. Blok tanpa padanan markdown** ditulis sebagai penanda komentar HTML berisi JSON blok, diikuti HTML sungguhan (pola yang sama dipakai Gutenberg di `post_content`):

```html
<!-- cms:button {"url":"/daftar","label":"Daftar"} -->
<a class="cms-button" href="/daftar">Daftar</a>
```

Penanda adalah yang dibaca ulang editor (round-trip lossless). HTML setelahnya yang seharusnya ditampilkan renderer.

---

# 4. Matriks Kompatibilitas per Blok

Diuji terhadap pipeline di §2.

| Blok | Bentuk tersimpan | Situs publik | Catatan |
| --- | --- | --- | --- |
| Paragraf | markdown | ✅ | |
| Heading | `## teks` | ✅ | |
| Daftar | `- item` / `1. item` | ✅ | |
| Kutipan | `> teks` | ✅ | |
| Kode | ```` ``` ```` | ✅ | |
| Pemisah | `---` | ✅ | |
| Gambar | `![alt](url)` | ✅ | `img` + `src`/`alt` sudah diizinkan |
| **Tabel** | tabel GFM | ✅ | `table/thead/tbody/tr/th/td` sudah di allowlist |
| Tombol | penanda + `<a class>` | ❌ | penanda jadi teks; `class` dibuang |
| Embed / Video | penanda + `<iframe>` | ❌ | `iframe` tidak di allowlist |
| Kalender | penanda + `<table class>` | ❌ | penanda jadi teks; `caption` tidak di allowlist |
| Kolom | penanda + `<div>` | ❌ | `div` tidak di allowlist |
| HTML Kustom | penanda + markup | ❌ | seluruhnya di-escape |

**8 dari 13 blok sudah aman hari ini** — termasuk Tabel, yang sengaja diserialkan ke tabel GFM justru supaya lolos tanpa perubahan backend.

### Seperti apa kerusakannya

Untuk blok Tombol, pengunjung situs publik akan melihat teks literal:

```
<!-- cms:button {"url":"/daftar","label":"Daftar"} --> <a class="cms-button" href="/daftar">Daftar</a>
```

Diperparah `linkify: true` (`:56`) yang mengubah URL di dalam JSON penanda jadi tautan, sehingga keluarannya makin berantakan.

---

# 5. Kenapa Rusak — Urutan Kejadiannya

```
bodyMarkdown (DB, utuh termasuk penanda)
        │
        ▼
MarkdownIt({ html: false })        ← GERBANG 1: <div>, <iframe>, <!-- --> di-escape jadi teks
        │
        ▼
sanitizeHtml({ allowedTags, … })   ← GERBANG 2: class dibuang, div/iframe/caption dibuang
        │
        ▼
HTML situs statis
```

Gerbang 1 saja sudah cukup untuk merusak keluaran. Memperbaiki gerbang 2 saja tidak menolong — keduanya harus diperbaiki bersamaan.

---

# 6. Opsi Perbaikan

## Opsi A — Batasi editor ke blok markdown saja

Hapus blok Tombol, Embed, Kalender, Kolom, HTML dari admin app.

- Perubahan backend: **nol**
- Waktu: ~30 menit di admin app
- Konsekuensi: fitur yang Anda minta (widget kalender, dll.) hilang

Layak dipakai sebagai penambal darurat kalau ada build produksi yang harus jalan besok, bukan sebagai tujuan akhir.

## Opsi B — Aktifkan HTML terbatas di renderer ⭐ **direkomendasikan**

Satu file backend, tanpa migrasi. Membuat 13 blok jalan semua.

```ts
// eta-site-renderer.ts

const ALLOWED_TAGS = [
  …tag yang sudah ada,
  'div',            // blok Kolom
  'iframe',         // blok Embed
  'caption',        // judul tabel Kalender
  'figure',
  'figcaption',
];

// Penanda blok tetap perlu di-render sebagai HTML supaya tidak bocor jadi teks.
// Aman karena sanitizeHtml di bawah tetap jadi gerbang sesungguhnya.
this.md = new MarkdownIt({ html: true, linkify: true, breaks: true });

private renderMarkdown(markdown: string): string {
  const html = this.md.render(markdown ?? '');
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'loading'],
      iframe: ['src', 'loading', 'title', 'allowfullscreen'],
    },
    // Hanya class milik CMS yang lolos — bukan class sembarangan.
    allowedClasses: {
      a: ['cms-button'],
      div: ['cms-columns', 'cms-column', 'cms-embed'],
      table: ['cms-calendar'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    // Kunci embed ke penyedia yang dikenal — ini mitigasi utama pengaktifan iframe.
    allowedIframeHostnames: ['www.youtube.com', 'player.vimeo.com'],
  });
}
```

Penanda `<!-- cms:… -->` tidak butuh opsi khusus: sanitize-html **membuang komentar HTML secara default**, dan itu memang perilaku yang diinginkan — penanda hanyalah metadata editor, bukan konten publik. (Tidak ada opsi `allowComments` di sanitize-html v2; jangan menambahkannya.)

### Catatan keamanan

`html: true` memang membuka permukaan XSS di lapisan markdown — tapi `sanitizeHtml` yang berjalan **setelahnya** adalah gerbang sesungguhnya, dan allowlist di atas justru lebih ketat daripada default sanitize-html. Ditambah:

- `allowedClasses` membatasi ke class CMS saja, bukan `class` bebas.
- `allowedIframeHostnames` mencegah iframe ke domain sembarangan.
- Penulis konten adalah site member yang sudah terautentikasi (`SessionAuthGuard` + `SiteMemberGuard`), bukan publik anonim.

Yang **tidak** boleh dilakukan: menaruh `'*': ['class']` di `allowedAttributes`, atau `allowedTags: false`.

### Yang juga perlu: CSS tema

Blok merender class yang butuh style di template Eta (`src/modules/builder/templates/default/`):

```css
.cms-button { display:inline-block; padding:.5em 1.1em; border-radius:.375rem;
              background:#075985; color:#fff; text-decoration:none; font-weight:500; }
.cms-columns { display:grid; gap:1rem; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); }
.cms-embed { position:relative; padding-bottom:56.25%; height:0; }
.cms-embed iframe { position:absolute; inset:0; width:100%; height:100%; border:0; }
.cms-calendar td { text-align:center; }
```

Style yang sama sudah dipakai di pratinjau admin (`BlockEditor.svelte`), jadi bisa disalin agar pratinjau dan hasil publik konsisten.

## Opsi C — Kolom `blocks` JSONB (jangka panjang)

Menyimpan struktur blok sebagai data, bukan menuliskannya ke string lalu mem-parse ulang.

```ts
// migrasi
blocks: jsonb('blocks'),                     // nullable — konten lama tetap null
bodyMarkdown: text('body_markdown').notNull().default(''),  // dipertahankan
```

- `blocks` jadi sumber kebenaran saat ada isinya; `bodyMarkdown` tetap ditulis sebagai turunan supaya pencarian, ekspor, RSS, dan konten lama tidak rusak.
- Renderer berjalan di atas array blok (tidak ada parsing markdown untuk blok kaya), jadi tidak perlu `html: true` sama sekali — lebih aman daripada Opsi B.
- Butuh: migrasi Drizzle, update DTO Zod, block-walker di renderer, dan strategi untuk konten hasil impor WordPress (`wp_id`/`wp_guid` sudah ada di schema).

Ini arah yang benar untuk Phase 2 (`PRD.md` §15 sudah mencantumkan block editor sebagai Phase 2), tapi **bukan prasyarat** — Opsi B sudah membuat semuanya jalan sekarang.

---

# 7. Rekomendasi

1. **Sekarang:** kerjakan Opsi B. Cakupannya satu file + satu blok CSS, tanpa migrasi, dan langsung menghidupkan seluruh 13 blok.
2. **Phase 2:** pindah ke Opsi C saat block editor benar-benar di-scope, dengan `bodyMarkdown` tetap ditulis sebagai turunan agar kompatibel mundur.
3. **Jangan** menyanitasi saat simpan. Perilaku sekarang (verbatim di DB, disanitasi saat render) yang membuat round-trip editor bekerja. Menyanitasi di `POST`/`PATCH` akan merusak penanda blok dan membuat konten tidak bisa diedit ulang.

---

# 8. Checklist Verifikasi

Setelah menerapkan Opsi B, publish satu artikel berisi ketiga belas blok lalu periksa:

- [ ] Tidak ada teks `<!-- cms:` yang terlihat di halaman hasil build
- [ ] Tombol tampil sebagai tombol, bukan tautan polos, dan `href`-nya benar
- [ ] Embed YouTube tampil; embed ke domain acak **tidak** tampil (buktikan `allowedIframeHostnames` bekerja)
- [ ] Kalender tampil sebagai tabel dengan judul bulan
- [ ] Kolom tampil berdampingan di layar lebar
- [ ] Blok HTML Kustom berisi `<script>alert(1)</script>` **tidak** tereksekusi
- [ ] Buka ulang artikel di admin — semua blok terparse kembali ke tipe aslinya, bukan jadi Paragraf
- [ ] Artikel lama (markdown murni, sebelum block editor) tetap tampil normal

Poin terakhir dua itu yang paling sering terlewat: keduanya menguji jalur baca, bukan jalur tulis.

---

# 9. Status Implementasi

**Opsi B sudah diterapkan** di repo `unej-cms` (branch `master`, belum di-commit).

| Berkas | Perubahan |
| --- | --- |
| `src/modules/builder/render/eta-site-renderer.ts` | `html: true`; tambah `div`/`iframe`/`caption`/`figure`/`figcaption` ke `ALLOWED_TAGS`; tambah konstanta `ALLOWED_CLASSES` & `ALLOWED_IFRAME_HOSTNAMES`; atribut `iframe` di-allowlist |
| `src/modules/builder/templates/default/layout.eta` | Tambah blok `<style>` untuk `.cms-button`, `.cms-columns`, `.cms-embed`, `.cms-calendar`, plus style dasar tabel dan `img` responsif |
| Schema / migrasi | **Tidak ada** |

Tidak ada perubahan pada endpoint, DTO, guard, maupun bentuk response — admin app tidak perlu disesuaikan.

### Hasil verifikasi

Pipeline render (markdown-it + sanitize-html dengan konfigurasi baru) diuji langsung terhadap keluaran asli block editor, 11/11 lulus:

| Uji | Hasil |
| --- | --- |
| Penanda `<!-- cms:… -->` tidak bocor sebagai teks | ✅ |
| Tombol jadi `<a class="cms-button">` | ✅ |
| Embed YouTube dipertahankan | ✅ |
| Embed ke `evil.com` dibuang | ✅ |
| Tabel GFM ter-render | ✅ |
| Kalender + `<caption>` dipertahankan | ✅ |
| Kolom dipertahankan | ✅ |
| `<script>` dibuang | ✅ |
| Atribut `onclick` dibuang | ✅ |
| Class non-CMS (`jahat`) dibuang | ✅ |
| Teks di dalam blok HTML tetap tampil | ✅ |

Yang **belum** diuji karena butuh build situs sungguhan: dua poin terakhir di checklist §8 (buka ulang artikel di admin, dan artikel lama pra-block-editor). Keduanya menguji jalur baca, bukan jalur tulis.
