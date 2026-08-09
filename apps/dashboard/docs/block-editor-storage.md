# Kontrak Penyimpanan Page Builder

Page Builder memakai kolom `body_markdown` yang sudah ada pada halaman dan
berita. Tidak ada kolom JSON baru dan tidak ada migrasi database. Bentuk ini
sengaja mirip `post_content` Gutenberg: metadata blok dan fallback publik
disimpan bersama dalam satu string yang portabel.

## Lifecycle plugin

- `unej.page-builder` aktif: dashboard menampilkan canvas visual, inserter,
  pola halaman, outline, undo/redo, serta preview responsif.
- Plugin nonaktif atau belum diinstal: editor blok inti dan mode Markdown tetap
  tersedia, tetapi inserter menyembunyikan blok kaya serta pola Page Builder.
- Blok Form hanya ditawarkan saat `unej.form-builder` aktif; kedua plugin tidak
  saling bergantung.
- Deactivate/uninstall tidak menghapus atau mengubah halaman dan berita.
- Aset CSS publik hanya diinjeksi saat plugin aktif. Tanpa aset itu, fallback
  HTML tetap semantik dan terbaca, tetapi tidak mendapat presentasi visual
  Page Builder.

## Format marker v2

Blok yang tidak mempunyai padanan Markdown memakai marker versi 2:

```html
<!-- cms:v2:callout %7B%22id%22%3A%22...%22%2C...%7D -->
<aside class="cms-pb-callout">...</aside>
<!-- /cms:v2:callout -->
```

Payload adalah JSON yang diproses dengan `encodeURIComponent`. Karena karakter
`>` tidak dibiarkan mentah, nilai pengguna seperti `-->` tidak dapat menutup
marker pembuka. Closing marker memberi parser batas yang stabil meski fallback
HTML berisi baris kosong atau elemen bertingkat.

Komentar dengan namespace `cms:` dicadangkan untuk host. Pada blok HTML Kustom,
komentar reserved tersebut dinetralkan hanya pada fallback publik; nilai asli
tetap utuh di payload sehingga round-trip editor tidak kehilangan data.

Parser tetap membaca marker v1 berikut agar konten lama kompatibel:

```html
<!-- cms:button {"url":"/daftar","label":"Daftar"} -->
<a class="cms-button" href="/daftar">Daftar</a>
```

## Jenis blok

Blok Markdown standar: heading, paragraf, gambar, kutipan, daftar, kode,
pemisah, dan tabel.

Blok ber-marker: tombol, embed, kalender, kolom, HTML Kustom, formulir, Hero,
Callout, Cards, Gallery, Statistics, FAQ, dan Spacer.

Blok Page Builder kaya memakai class bernamespace `cms-pb-*` dengan modifier
finite untuk tone, alignment, jumlah kolom, dan spacing. Jangan menerima
wildcard class baru pada renderer tanpa review keamanan.

## Pipeline publik

```text
bodyMarkdown
  -> MarkdownIt (raw HTML aktif)
  -> sanitize-html (allowlist tag, atribut, class, scheme, iframe host)
  -> ekspansi Form Builder
  -> renderer theme
  -> injeksi aset plugin aktif
  -> situs statis
```

Sanitasi dilakukan saat build, bukan saat simpan. Ini penting agar metadata
marker tetap utuh di database dan dapat dibaca kembali oleh editor.

`ContentRenderer` hanya mempertahankan:

- tag semantik yang dibutuhkan blok;
- class CMS dan Page Builder yang terdaftar secara eksplisit;
- URL dengan scheme aman;
- iframe YouTube/Vimeo;
- atribut media dan form yang memang digunakan host.

Script, event handler, inline style, iframe host asing, JavaScript URL, class
asing, dan komentar metadata dibuang dari hasil publik.

## Style

CSS seluruh blok kaya `cms-pb-*` dimiliki package
`@unej-cms/plugin-page-builder`, bukan theme. Builder menulis asset ber-hash ke
`assets/plugins/unej.page-builder/` dan menginjeksi tag stylesheet secara
otomatis. Theme tetap memberi baseline untuk blok inti host seperti tombol,
kolom, embed, dan kalender agar editor inti serta plugin lain tidak bergantung
pada aktivasi Page Builder. Theme boleh menyediakan token CSS seperti
`--theme-primary`, tetapi semua token Page Builder mempunyai fallback.

## Checklist regresi

- Marker v2 round-trip untuk semua blok kaya, termasuk payload `-->` dan HTML
  multiline.
- Marker v1 tetap terbaca.
- Pattern insertion selalu menghasilkan ID blok/item baru.
- Modifier tak dikenal dinormalisasi dan class tak dikenal dibuang renderer.
- Script, event attribute, JavaScript URL, dan iframe asing tidak lolos.
- Aset Page Builder ada tepat sekali saat plugin aktif dan tidak ada saat
  plugin nonaktif/uninstalled.
- Halaman dan berita lama berbasis Markdown tetap dapat diedit dan dipublish.
- Deactivate/uninstall tidak menghapus isi `body_markdown`.
