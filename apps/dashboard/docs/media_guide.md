# Product Requirements Document (PRD)

# Unej CMS — Media Library

### Untuk Nuxt Admin Application

Version: 1.0 MVP

Status: Draft — backend sudah selesai diimplementasikan, dokumen ini menspesifikasikan UI di atasnya.

Companion document ke `docs/PRD.md` (platform-wide) dan `docs/PRD-ADMIN.md` (admin dashboard, ditulis untuk SvelteKit — di §4 dan §15 dokumen itu, Media Library masih tercatat sebagai "belum ada backend"). **Itu sudah tidak akurat**: backend Media Library (module `src/modules/media/`, storage MinIO) sudah diimplementasikan dan diverifikasi build. Dokumen ini menggantikan status itu dan menspesifikasikan kebutuhan UI Media Library untuk tim admin app yang membangun dengan **Nuxt**.

---

# 1. Overview

## Vision

Media Library yang terasa familiar seperti wp-admin: grid thumbnail, upload drag-and-drop, panel detail untuk edit alt text/caption, dan picker yang bisa dipanggil dari field manapun yang butuh gambar (featured image News/Pages, logo/favicon Site) — tanpa reload halaman.

Sama seperti fitur admin lain, app **tidak pernah bicara langsung ke MinIO/S3**. Semua upload dan manajemen file lewat REST API `sites/:siteId/media` di backend NestJS; backend yang menyimpan file ke MinIO dan mengembalikan URL publik permanen.

---

# 2. Background

Backend baru saja menambahkan modul Media (lihat `src/modules/media/`):

- Tabel `media` (per-site, lihat §7 untuk shape lengkap).
- Storage MinIO dengan bucket public-read — setiap file yang diupload dapat URL permanen yang bisa langsung dipakai sebagai `<img src>` atau di-embed di body markdown, tanpa perlu token/signed URL.
- Endpoint CRUD + upload di bawah `sites/:siteId/media`, guard sama seperti News/Pages/Tags (`SessionAuthGuard` + `SiteMemberGuard` — semua site member, tidak ada role "Media Manager" terpisah).

Field `featuredImageUrl` di News dan `logoUrl`/`faviconUrl` di Sites sebelumnya adalah input URL manual (lihat PRD-ADMIN §9.6). Dengan Media Library ini, field-field tersebut **tetap string URL di backend** (tidak ada migrasi FK ke tabel `media`) — tapi sekarang UI bisa mengisinya lewat Media Picker alih-alih user paste URL manual.

---

# 3. Goals

- Editor bisa upload gambar/PDF, cari file yang sudah pernah diupload, dan pakai ulang tanpa upload dobel.
- Satu komponen Media Picker yang reusable dipanggil dari form News, Pages, dan Site settings — bukan implementasi terpisah tiap tempat.
- Upload terasa responsif: progress indicator untuk file sampai 10MB, preview sebelum submit.

## Non-Goals (Phase 1)

- **Folder/album** — backend tidak punya struktur folder, hanya flat list per site (grouped otomatis by tahun/bulan di object key, tapi ini detail storage, bukan sesuatu yang perlu direpresentasikan di UI sebagai folder browsable).
- **Image editing** (crop/resize/rotate di browser) — backend menyimpan file apa adanya, tidak ada endpoint untuk replace/edit binary setelah upload.
- **Thumbnail otomatis** — backend **tidak** generate thumbnail; `url` yang dikembalikan selalu file asli. Grid view harus scale-down di client (`<img>` dengan `object-fit: cover` + `loading="lazy"`), bukan minta backend endpoint terpisah untuk thumbnail. Untuk file besar (mendekati 10MB), ini bisa berat — dicatat sebagai gap, lihat §9.
- **Video/audio** — `ALLOWED_MIME_TYPES` backend hanya `image/jpeg|png|gif|webp|svg+xml` dan `application/pdf`. Upload video akan ditolak backend dengan 400.
- **Bulk upload endpoint** — `POST .../media` menerima **satu file per request**. Multi-file upload di UI harus loop request satu-satu (lihat §9 untuk implikasi UX).
- **"Used in" / reference tracking** — backend tidak tahu (dan tidak mencegah) kalau sebuah media dipakai di News/Pages manapun. Hapus media tidak mem-validasi apakah URL-nya masih dipakai di `featuredImageUrl` atau body markdown manapun. **UI wajib menampilkan warning generik saat delete** (lihat §8.4), bukan berasumsi backend akan mencegah.
- **Storage quota / limit jumlah file per site** — tidak ada penegakan di backend.

---

# 4. Target Users & Permissions

Sama seperti News/Pages (PRD-ADMIN §5, §10) — tidak ada role "Media Manager" terpisah di backend:

| Aksi                          | super_admin | site_admin (site sendiri) | editor/reviewer/author (site sendiri) | Tanpa role di site |
| ----------------------------- | ----------- | ------------------------- | ------------------------------------- | ------------------ |
| Lihat/upload/edit/hapus media | ✅          | ✅                        | ✅ (tidak dibedakan)                  | ❌ (403)           |

Semua site member punya akses penuh CRUD media — tidak ada pembedaan "hanya boleh upload, tidak boleh hapus punya orang lain". Kalau ini jadi masalah nyata (mis. reviewer menghapus file milik author), itu backend gap yang perlu ditambahkan sebagai guard baru, bukan sesuatu yang bisa di-workaround di UI.

---

# 5. Information Architecture (Nuxt)

```
/sites/:siteId/media                — halaman Media Library (grid + upload)
```

Selain halaman penuh di atas, **Media Picker** adalah komponen modal/drawer reusable (bukan route terpisah) yang dipanggil dari:

- Form News/Pages — tombol "Pilih Gambar" di sebelah field featured image, membuka picker dalam mode "pilih 1 file existing atau upload baru", hasil pilihan mengisi field `featuredImageUrl` (string URL) di form.
- Form Site settings — sama, untuk `logoUrl`/`faviconUrl`.
- (Phase 2, menunggu block editor) — insert gambar ke body markdown/block content.

Komponen picker ini harus punya dua mode: `embed` (pilih existing dari grid + tab upload baru, mengembalikan `url` string ke parent form lewat emit/callback) dan `standalone` (halaman penuh `/sites/:siteId/media` untuk kelola library, termasuk edit metadata dan delete — tidak relevan untuk mode embed).

---

# 6. Core Features (Phase 1)

## 6.1 Grid/List View

- `GET /sites/:siteId/media?page=&limit=&type=&search=` (lihat §7 untuk shape response).
- Default: grid thumbnail (gambar) / icon generik (PDF), urut terbaru dulu (`createdAt desc`, sudah default di backend).
- Filter: dropdown type (`Semua` / `Gambar` / `Dokumen`), search box (debounced, filter by `originalName`, ILIKE substring — bukan full-text search).
- Pagination: backend return `{ page, limit, total, totalPages }` — pakai untuk pager di bawah grid, bukan infinite scroll di Phase 1 (lebih sederhana, konsisten dengan tidak adanya infinite-scroll di halaman List News/Pages).

## 6.2 Upload

- Drag-and-drop zone + tombol "Pilih File" (input file native, `accept` di-set ke daftar mimetype yang sama dengan `ALLOWED_MIME_TYPES` backend supaya file picker OS sudah filter duluan — tapi backend tetap validasi ulang, jangan percaya `accept` sebagai satu-satunya validasi).
- Validasi client **sebelum** request (mirror backend): ukuran ≤ 10MB, mimetype termasuk allowlist. Tampilkan error inline kalau gagal, jangan biarkan request terkirim lalu baru gagal di server.
- Multi-file drop/select: karena backend cuma terima 1 file per request, UI harus **queue dan kirim satu-satu**, masing-masing dengan progress bar sendiri (list upload items dengan status per-item: pending/uploading/success/error) — bukan satu progress bar gabungan yang menyesatkan.
- Field opsional saat upload: `altText`, `caption` — bisa diisi langsung di form upload (dikirim sebagai form-field multipart bareng `file`) atau diisi belakangan lewat edit (§6.3). Untuk Phase 1, cukup sediakan input alt text di form upload (accessibility-nudge), caption opsional/collapsed.
- Request: `multipart/form-data`, field `file` (binary) + `altText`/`caption` (text, opsional). Response `201` dengan row `Media` lengkap termasuk `url` — langsung tambahkan ke grid di posisi awal (optimistic prepend), tidak perlu refetch seluruh list.

## 6.3 Detail / Edit Panel

- Klik item grid → buka side panel/drawer: preview besar, `originalName`, `mimeType`, `size` (format human-readable, mis. "1.2 MB"), `width`x`height` (kalau ada — bisa `null` untuk SVG atau gambar yang gagal dibaca dimensinya, sembunyikan baris itu kalau `null`), `createdAt`, tombol "Copy URL".
- Form edit: `altText`, `caption` — `PATCH /sites/:siteId/media/:id`, auto-save on blur atau tombol "Simpan" eksplisit (pilih salah satu, konsisten dengan pola form News/Pages yang eksplisit → **pakai tombol Simpan eksplisit** untuk konsistensi).
- `objectKey` dan `uploadedById` ditampilkan sebagai info sekunder saja (read-only, tidak ada UI untuk mengubahnya) — kalau mau tampilkan nama uploader, perlu resolve `uploadedById` ke nama lewat `GET /users` (lihat gap terkait di PRD-ADMIN §13 gap #6: belum ada endpoint lookup user by id secara ringan; kalau daftar user site itu kecil, fetch `GET /sites/:siteId/members` — **catatan: endpoint ini belum ada di backend saat ini, hanya `POST/DELETE members`**, jadi Phase 1 cukup tampilkan `uploadedById` mentah atau skip field ini sampai backend expose endpoint list member).

## 6.4 Delete

- Tombol Delete di detail panel + di grid (hover action).
- Konfirmasi dialog wajib (destruktif, hard delete — backend hapus row DB **dan** object di MinIO, tidak ada trash/restore).
- **Warning text eksplisit**: "File ini mungkin masih dipakai di artikel/halaman lain. Backend tidak mengecek pemakaian sebelum menghapus." — karena tidak ada reference tracking (§3 Non-Goals), UI wajib jujur ke user tentang risiko ini alih-alih diam-diam.
- `DELETE /sites/:siteId/media/:id` → `{ success: true }`, remove dari grid state (optimistic) setelah response 200.

## 6.5 Media Picker (embed mode)

- Dipanggil dari form lain (§5). Tampilan: grid yang sama (reuse komponen §6.1) + tab "Upload Baru" (reuse §6.2), tapi setiap item grid punya tombol "Pilih" alih-alih klik-untuk-detail.
- Pilih item → emit `{ url, id, altText }` ke parent, tutup modal, parent form mengisi field-nya (`featuredImageUrl` dll.) dengan `url`.
- Tidak perlu halaman/route terpisah — modal di atas form yang memanggilnya.

---

# 7. API Integration Reference

Base URL & auth sama seperti PRD-ADMIN §11: `credentials: 'include'`, session cookie httpOnly, base path `sites/:siteId/media`.

## Media entity (response shape)

```ts
interface Media {
  id: string; // uuid
  siteId: string; // uuid
  uploadedById: string; // uuid, FK ke users — tidak di-expand, hanya id
  objectKey: string; // path internal MinIO, info sekunder
  originalName: string;
  mimeType: string; // salah satu dari ALLOWED_MIME_TYPES
  size: number; // bytes
  url: string; // URL publik permanen, langsung pakai
  altText: string | null;
  caption: string | null;
  width: number | null; // null untuk non-image atau gagal dibaca
  height: number | null;
  createdAt: string; // ISO timestamp
  updatedAt: string;
}
```

## Endpoints

| Method | Path                       | Body / Query                                                                                         | Response                                             |
| ------ | -------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| GET    | `/sites/:siteId/media`     | Query: `page?` (default 1), `limit?` (default 20, max 100), `type?` (`image`\|`document`), `search?` | `{ items: Media[], page, limit, total, totalPages }` |
| GET    | `/sites/:siteId/media/:id` | —                                                                                                    | `Media`                                              |
| POST   | `/sites/:siteId/media`     | `multipart/form-data`: `file` (required), `altText?`, `caption?`                                     | `201 Media`                                          |
| PATCH  | `/sites/:siteId/media/:id` | JSON: `{ altText?, caption? }`                                                                       | `Media`                                              |
| DELETE | `/sites/:siteId/media/:id` | —                                                                                                    | `{ success: true }`                                  |

## Error shapes — **perhatikan ada dua bentuk berbeda untuk endpoint upload**

- Validasi field `altText`/`caption` (via Zod, sama seperti modul lain) → `400` dengan body **array**: `[{ path: string, message: string }]`.
- Validasi file (mimetype tidak diizinkan, ukuran > 10MB) → `400` dengan body **object** standar NestJS: `{ statusCode: 400, message: string, error: "Bad Request" }` — **bukan** array seperti di atas, karena ini dilempar dari `BadRequestException` biasa di controller/service, bukan lewat `ZodValidationPipe`. UI harus handle kedua bentuk ini secara terpisah saat menampilkan error upload (cek apakah `message` adalah array atau string).
- `401`/`403`/`404` — sama seperti modul lain (lihat PRD-ADMIN §11).

## Constraints untuk divalidasi di client (mirror backend, `src/modules/media/media.constants.ts`)

```ts
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
```

---

# 8. Non-Functional Requirements

- **Bahasa**: UI Bahasa Indonesia, konsisten dengan PRD-ADMIN §12.
- **Progress feedback**: upload pakai `XMLHttpRequest`/`fetch` dengan progress event (native `fetch` tidak expose upload progress — kalau butuh progress bar akurat per file, pakai `XMLHttpRequest` atau library kecil seperti `axios` khusus untuk request upload; endpoint lain tetap native `fetch` sesuai PRD-ADMIN §7 buat konsistensi, upload adalah pengecualian yang dijustifikasi).
- **Preview sebelum upload**: tampilkan thumbnail lokal (`URL.createObjectURL`) sebelum file terkirim, supaya user tahu file apa yang akan diupload.
- **Performa grid**: karena tidak ada thumbnail server-side (§3), pertimbangkan `loading="lazy"` + `decoding="async"` pada `<img>`, dan batasi `limit` default (20) supaya tidak load puluhan gambar full-res sekaligus.
- **Keamanan**: URL media bersifat **publik tanpa autentikasi** (bucket public-read) — UI harus komunikasikan ini secara implisit (jangan sediakan tempat upload dokumen sensitif/rahasia sebagai "media"). Tidak perlu UI khusus untuk ini, cukup dihindari lewat copywriting form upload.

---

# 9. Known Gaps / Catatan untuk Tim Nuxt

1. **Tidak ada thumbnail** — grid menampilkan file asli yang di-scale CSS. Kalau ini jadi masalah performa nyata, solusinya di backend (generate thumbnail saat upload), bukan di admin app.
2. **Delete tidak cek pemakaian** — lihat §6.4, tampilkan warning generik.
3. **Upload satu file per request** — UI harus queue multi-file manual (§6.2).
4. **Tidak ada endpoint list site member yang ringan** — untuk resolve `uploadedById` ke nama, opsi realistis Phase 1 adalah skip menampilkan nama uploader, atau (kalau super_admin) fetch `GET /users` penuh dan filter client seperti pola yang sudah dipakai di PRD-ADMIN §9.4.
5. **Tidak ada rename** setelah upload — `originalName` tersimpan permanen dari nama file saat diupload, tidak ada endpoint untuk mengubahnya (beda dari `altText`/`caption` yang memang bisa di-PATCH).
6. Dokumen ini ditulis untuk Nuxt sesuai arahan terbaru — `docs/PRD-ADMIN.md` §7 masih menyebut SvelteKit sebagai stack admin app. Kalau keputusan pindah ke Nuxt berlaku untuk seluruh admin app (bukan cuma Media), `PRD-ADMIN.md` perlu direvisi terpisah supaya kedua dokumen tidak kontradiksi — di luar scope dokumen ini.

---

# 10. Success Metrics

- Editor bisa upload gambar dan memakainya sebagai featured image News dalam < 30 detik, tanpa perlu tahu URL MinIO secara manual.
- Zero kasus "paste URL rusak" di field featured image setelah Media Picker live (dibanding sebelumnya paste manual, PRD-ADMIN §9.6).
